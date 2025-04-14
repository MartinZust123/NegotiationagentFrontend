import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import React, { useState, useRef, useEffect } from "react";
import VideoUpload from "./components/VideoUpload";
import CutVideo from "./components/CutVideo";
import TextArea from "./components/TextArea";
import WorldModelDisplay from './components/WorldModelDisplay';
import AdviceDisplay from './components/AdviceDisplay';
import AdvicePopup from './components/AdvicePopup';

function App() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [cutVideoSrc, setCutVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [segments, setSegments] = useState<{start: number; end: number}[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [speaker1Name, setSpeaker1Name] = useState("Speaker 1");
  const [speaker2Name, setSpeaker2Name] = useState("Speaker 2");
  const [transcriptions, setTranscriptions] = useState<Array<{
    start: number;
    end: number;
    text: string;
  }>>([]);
  const [lastTranscriptionTime, setLastTranscriptionTime] = useState<number>(0);
  const [showTranscription, setShowTranscription] = useState(false);
  const [speaker1Goals, setSpeaker1Goals] = useState<string>('');
  const [speaker2Goals, setSpeaker2Goals] = useState<string>('');
  const [goalsSubmitted, setGoalsSubmitted] = useState<boolean>(false);
  const [showSpeaker1Transcription, setShowSpeaker1Transcription] = useState(false);
  const [showSpeaker2Transcription, setShowSpeaker2Transcription] = useState(false);
  const [speaker1WorldModel, setSpeaker1WorldModel] = useState<any>('');
  const [speaker2WorldModel, setSpeaker2WorldModel] = useState<any>('');
  const [showSpeaker1WorldModel, setShowSpeaker1WorldModel] = useState(false);
  const [showSpeaker2WorldModel, setShowSpeaker2WorldModel] = useState(false);
  const [speaker1Advice, setSpeaker1Advice] = useState<string | null>(null);
  const [speaker2Advice, setSpeaker2Advice] = useState<string | null>(null);
  const [showSpeaker1Advice, setShowSpeaker1Advice] = useState(false);
  const [showSpeaker2Advice, setShowSpeaker2Advice] = useState(false);
  const [showAdvicePopup, setShowAdvicePopup] = useState(false);
  const [currentAdvice, setCurrentAdvice] = useState<string | null>(null);
  const [isLoadingSpeaker1Advice, setIsLoadingSpeaker1Advice] = useState(false);
  const [isLoadingSpeaker2Advice, setIsLoadingSpeaker2Advice] = useState(false);
  
  const speaker1Ref = useRef<HTMLVideoElement>(null);
  const speaker2Ref = useRef<HTMLVideoElement>(null);

  const handleSegmentVideo = () => {
    // Proceed to CutVideo component immediately
    setCutVideoSrc(videoSrc);
    setIsSegmenting(true);

    // Upload video in the background
    (async () => {
      try {
        const videoResponse = await fetch(videoSrc!);
        const videoBlob = await videoResponse.blob();

        const formData = new FormData();
        formData.append('video', videoBlob, 'video.mp4');

        const saveResponse = await fetch('http://localhost:5000/saveVideo', {
          method: 'POST',
          body: formData
        });

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json();
          throw new Error(errorData.error || 'Failed to save video');
        }
      } catch (error) {
        console.error('Error saving video:', error);
        // Just log the error without blocking the UI
      }
    })();
  };

  const handleSegmentComplete = () => {
    setIsSegmenting(true);
    setCutVideoSrc(null);
    setVideoSrc(cutVideoSrc);
    setCurrentSegmentIndex(0);
  };

  const togglePlayback = () => {
    if (!speaker1Ref.current || !speaker2Ref.current || segments.length === 0) return;

    if (isPlaying) {
      speaker1Ref.current.pause();
      speaker2Ref.current.pause();
    } else {
      const currentSegment = segments[currentSegmentIndex];
      speaker1Ref.current.currentTime = currentSegment.start;
      speaker2Ref.current.currentTime = currentSegment.start;
      
      if (currentSegmentIndex % 2 === 0) {
        speaker1Ref.current.play();
      } else {
        speaker2Ref.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const transcribeSegment = async (start: number, end: number, segmentIndex: number) => {
    try {
      const response = await fetch('http://localhost:5000/transcribeSegment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ start, end }),
      });

      if (response.ok) {
        const result = await response.json();
        setTranscriptions(prev => {
          // Find if we already have a transcription for this segment
          const existingIndex = prev.findIndex(t => 
            t.start === segments[segmentIndex].start && 
            t.end === segments[segmentIndex].end
          );

          if (existingIndex >= 0) {
            // Append new text to existing segment
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              text: updated[existingIndex].text + ' ' + result.text
            };
            return updated;
          } else {
            // Add new segment
            return [...prev, {
              start: segments[segmentIndex].start,
              end: segments[segmentIndex].end,
              text: result.text
            }];
          }
        });
      }
    } catch (error) {
      console.error('Transcription error:', error);
    }
  };

  useEffect(() => {
    const speaker1 = speaker1Ref.current;
    const speaker2 = speaker2Ref.current;
    
    if (!speaker1 || !speaker2 || segments.length === 0) return;

    const handleTimeUpdate = () => {
      const currentSegment = segments[currentSegmentIndex];
      if (!currentSegment) return;

      const currentTime = currentSegmentIndex % 2 === 0 ? 
        speaker1.currentTime : 
        speaker2.currentTime;

      // Check if 30 seconds have passed since last transcription
      if (currentTime - lastTranscriptionTime >= 30) {
        const transcriptionStart = lastTranscriptionTime || currentSegment.start;
        transcribeSegment(transcriptionStart, currentTime, currentSegmentIndex);
        setLastTranscriptionTime(currentTime);
      }

      if (currentSegmentIndex % 2 === 0) {
        if (speaker1.currentTime >= currentSegment.end) {
          // Transcribe remaining part of segment if needed
          if (lastTranscriptionTime < currentSegment.end) {
            transcribeSegment(lastTranscriptionTime, currentSegment.end, currentSegmentIndex);
          }
          speaker1.pause();
          if (currentSegmentIndex + 1 < segments.length) {
            setCurrentSegmentIndex(currentSegmentIndex + 1);
            setLastTranscriptionTime(segments[currentSegmentIndex + 1].start);
            speaker2.currentTime = segments[currentSegmentIndex + 1].start;
            if (isPlaying) speaker2.play();
          } else {
            setIsPlaying(false);
          }
        }
      } else {
        // Similar logic for speaker 2
        if (speaker2.currentTime >= currentSegment.end) {
          if (lastTranscriptionTime < currentSegment.end) {
            transcribeSegment(lastTranscriptionTime, currentSegment.end, currentSegmentIndex);
          }
          speaker2.pause();
          if (currentSegmentIndex + 1 < segments.length) {
            setCurrentSegmentIndex(currentSegmentIndex + 1);
            setLastTranscriptionTime(segments[currentSegmentIndex + 1].start);
            speaker1.currentTime = segments[currentSegmentIndex + 1].start;
            if (isPlaying) speaker1.play();
          } else {
            setIsPlaying(false);
          }
        }
      }
    };

    speaker1.addEventListener('timeupdate', handleTimeUpdate);
    speaker2.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      speaker1.removeEventListener('timeupdate', handleTimeUpdate);
      speaker2.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [currentSegmentIndex, segments, isPlaying, lastTranscriptionTime]);

  const handleSegments = (newSegments: {start: number; end: number}[]) => {
    setSegments(newSegments);
  };

  const getCurrentTranscription = () => {
    const currentSegment = segments[currentSegmentIndex];
    if (!currentSegment) return '';
    
    const transcription = transcriptions.find(t => 
      t.start === currentSegment.start && t.end === currentSegment.end
    );
    return transcription?.text || '';
  };

  const handleSubmitGoals = () => {
    if (speaker1Goals.trim() && speaker2Goals.trim()) {
      setGoalsSubmitted(true);
    } else {
      alert('Please enter goals for both speakers');
    }
  };

  const generateWorldModel = async (speaker: string, speakerIndex: number) => {
    try {
      // Get all transcriptions for this speaker
      const speakerTranscriptions = transcriptions
        .filter((_, index) => index % 2 === (speakerIndex === 1 ? 0 : 1))
        .map(t => t.text);
      
      const response = await fetch('http://localhost:5000/generateWorldModel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speaker: speaker,
          segments: speakerTranscriptions
        }),
      });

      if (response.ok) {
        const worldModel = await response.json();
        if (speakerIndex === 1) {
          setSpeaker1WorldModel(worldModel);
        } else {
          setSpeaker2WorldModel(worldModel);
        }
      } else {
        console.error('Failed to generate world model');
      }
    } catch (error) {
      console.error('Error generating world model:', error);
    }
  };

  useEffect(() => {
    if (transcriptions.length > 0) {
      // Check if we have transcriptions for speaker 1
      const speaker1Transcriptions = transcriptions.filter((_, index) => index % 2 === 0);
      if (speaker1Transcriptions.length > 0) {
        generateWorldModel(speaker1Name, 1);
      }
      
      // Check if we have transcriptions for speaker 2
      const speaker2Transcriptions = transcriptions.filter((_, index) => index % 2 === 1);
      if (speaker2Transcriptions.length > 0) {
        generateWorldModel(speaker2Name, 2);
      }
    }
  }, [transcriptions]);

  const generateAdvice = async (speakerIndex: number) => {
    try {
      // Set loading state
      if (speakerIndex === 1) {
        setIsLoadingSpeaker1Advice(true);
      } else {
        setIsLoadingSpeaker2Advice(true);
      }

      const targetWorldModel = speakerIndex === 1 ? speaker2WorldModel : speaker1WorldModel;
      const speakerGoals = speakerIndex === 1 ? speaker1Goals : speaker2Goals;
      const speakerName = speakerIndex === 1 ? speaker1Name : speaker2Name;
      
      const speakerTranscriptions = transcriptions
        .filter((_, index) => index % 2 === (speakerIndex === 1 ? 0 : 1))
        .map(t => t.text);
      
      // Use empty string if world model isn't available yet instead of showing error
      const worldModelToUse = targetWorldModel || '';
      
      const response = await fetch('http://localhost:5000/give-advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speaker: speakerName,
          world_model: worldModelToUse,
          goals: speakerGoals,
          segments: speakerTranscriptions
        }),
      });

      if (response.ok) {
        const adviceData = await response.json();
        const adviceText = typeof adviceData === 'string' ? adviceData : adviceData.advice;
        
        // Store the advice and show it
        if (speakerIndex === 1) {
          setSpeaker1Advice(adviceText);
          setShowSpeaker1Advice(true);
          setIsLoadingSpeaker1Advice(false);
          
          // Automatically hide the advice after 20 seconds
          setTimeout(() => {
            setShowSpeaker1Advice(false);
          }, 20000);
        } else {
          setSpeaker2Advice(adviceText);
          setShowSpeaker2Advice(true);
          setIsLoadingSpeaker2Advice(false);
          
          // Automatically hide the advice after 20 seconds
          setTimeout(() => {
            setShowSpeaker2Advice(false);
          }, 20000);
        }
      } else {
        console.error('Failed to generate advice:', response.status);
        // Reset loading state on error
        if (speakerIndex === 1) {
          setIsLoadingSpeaker1Advice(false);
        } else {
          setIsLoadingSpeaker2Advice(false);
        }
      }
    } catch (error) {
      console.error('Error generating advice:', error);
      // Reset loading state on error
      if (speakerIndex === 1) {
        setIsLoadingSpeaker1Advice(false);
      } else {
        setIsLoadingSpeaker2Advice(false);
      }
    }
  };

  // First, create a reusable button style
  const buttonStyle = {
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    padding: "12px 24px",
    cursor: "pointer",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "500",
    transition: "all 0.3s ease",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    margin: "5px 0",
  };

  const greenButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#28a745",
  };

  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
    const isGreen = e.currentTarget.style.backgroundColor.includes("28a745");
    e.currentTarget.style.backgroundColor = isGreen ? "#218838" : "#0056b3";
  };

  const handleButtonLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
    const isGreen = e.currentTarget.style.backgroundColor.includes("218838");
    e.currentTarget.style.backgroundColor = isGreen ? "#28a745" : "#007bff";
  };

  return (
    <div className="App dark-theme">
      <nav className="navbar navbar-dark mb-4">
        <div className="container">
          <span className="navbar-brand">Negotiation Agent</span>
        </div>
      </nav>
      {!isSegmenting ? (
        <>
          <VideoUpload onVideoUpload={setVideoSrc} />
          {videoSrc && (
            <>
              <video controls src={videoSrc} style={{ width: "100%" }} />
              <button
                onClick={handleSegmentVideo}
                style={buttonStyle}
                onMouseEnter={handleButtonHover}
                onMouseLeave={handleButtonLeave}
              >
                Segment Video
              </button>
            </>
          )}
        </>
      ) : (
        cutVideoSrc ? (
          <CutVideo 
            videoUrl={cutVideoSrc} 
            onSegmentComplete={handleSegmentComplete}
            onSegmentsChange={handleSegments}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ 
                flex: 1,
                padding: '10px',
                border: currentSegmentIndex % 2 === 0 ? '3px solid #007bff' : '3px solid transparent',
                borderRadius: '8px',
                transition: 'border-color 0.3s ease',
                position: 'relative'
              }}>
                <input
                  type="text"
                  value={speaker1Name}
                  onChange={(e) => setSpeaker1Name(e.target.value)}
                  style={{
                    textAlign: 'center',
                    marginBottom: '10px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '1.5em',
                    fontWeight: 'bold',
                    width: '100%',
                    outline: 'none',
                    cursor: 'pointer',
                    color: 'white'
                  }}
                />
                <video 
                  ref={speaker1Ref}
                  src={videoSrc || undefined} 
                  style={{ width: "100%" }}
                  onError={(e) => console.error('Error playing speaker 1 video:', e)}
                />
                
                {showSpeaker1Advice && speaker1Advice && (
                  <div style={{ 
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    right: '10px',
                    backgroundColor: 'rgba(30, 30, 30, 0.9)',
                    padding: '12px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                    textAlign: 'left',
                    zIndex: 10,
                    border: '1px solid #007bff',
                    maxHeight: '40%',
                    overflow: 'auto'
                  }}>
                    <button
                      onClick={() => setShowSpeaker1Advice(false)}
                      style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        background: 'none',
                        border: 'none',
                        fontSize: '16px',
                        color: '#aaa',
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                    <h4 style={{ 
                      color: '#fff', 
                      marginTop: '0', 
                      marginBottom: '8px',
                      borderBottom: '1px solid #444',
                      paddingBottom: '6px',
                      fontSize: '16px'
                    }}>
                      Strategic Advice
                    </h4>
                    <div style={{ 
                      color: '#ddd', 
                      lineHeight: '1.4',
                      fontSize: '14px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {speaker1Advice}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ 
                flex: 1,
                padding: '10px',
                border: currentSegmentIndex % 2 === 1 ? '3px solid #007bff' : '3px solid transparent',
                borderRadius: '8px',
                transition: 'border-color 0.3s ease',
                position: 'relative'
              }}>
                <input
                  type="text"
                  value={speaker2Name}
                  onChange={(e) => setSpeaker2Name(e.target.value)}
                  style={{
                    textAlign: 'center',
                    marginBottom: '10px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '1.5em',
                    fontWeight: 'bold',
                    width: '100%',
                    outline: 'none',
                    cursor: 'pointer',
                    color: 'white'
                  }}
                />
                <video 
                  ref={speaker2Ref}
                  src={videoSrc || undefined} 
                  style={{ width: "100%" }}
                  onError={(e) => console.error('Error playing speaker 2 video:', e)}
                />
                
                {showSpeaker2Advice && speaker2Advice && (
                  <div style={{ 
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    right: '10px',
                    backgroundColor: 'rgba(30, 30, 30, 0.9)',
                    padding: '12px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                    textAlign: 'left',
                    zIndex: 10,
                    border: '1px solid #007bff',
                    maxHeight: '40%',
                    overflow: 'auto'
                  }}>
                    <button
                      onClick={() => setShowSpeaker2Advice(false)}
                      style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        background: 'none',
                        border: 'none',
                        fontSize: '16px',
                        color: '#aaa',
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                    <h4 style={{ 
                      color: '#fff', 
                      marginTop: '0', 
                      marginBottom: '8px',
                      borderBottom: '1px solid #444',
                      paddingBottom: '6px',
                      fontSize: '16px'
                    }}>
                      Strategic Advice
                    </h4>
                    <div style={{ 
                      color: '#ddd', 
                      lineHeight: '1.4',
                      fontSize: '14px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {speaker2Advice}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Goals section - only show if not submitted */}
            {!goalsSubmitted && (
              <>
                <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <textarea
                      value={speaker1Goals}
                      onChange={(e) => setSpeaker1Goals(e.target.value)}
                      disabled={goalsSubmitted}
                      placeholder="Enter goals for Speaker 1..."
                      style={{
                        width: '100%',
                        minHeight: '100px',
                        padding: '10px',
                        backgroundColor: '#2b2b2b',
                        color: 'white',
                        border: '1px solid #444',
                        borderRadius: '4px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <textarea
                      value={speaker2Goals}
                      onChange={(e) => setSpeaker2Goals(e.target.value)}
                      disabled={goalsSubmitted}
                      placeholder="Enter goals for Speaker 2..."
                      style={{
                        width: '100%',
                        minHeight: '100px',
                        padding: '10px',
                        backgroundColor: '#2b2b2b',
                        color: 'white',
                        border: '1px solid #444',
                        borderRadius: '4px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <button
                    onClick={handleSubmitGoals}
                    disabled={goalsSubmitted}
                    style={{
                      ...greenButtonStyle,
                      backgroundColor: goalsSubmitted ? "#666" : "#28a745",
                      cursor: goalsSubmitted ? "not-allowed" : "pointer",
                      width: "200px",
                    }}
                    onMouseEnter={e => {
                      if (!goalsSubmitted) {
                        handleButtonHover(e);
                      }
                    }}
                    onMouseLeave={e => {
                      if (!goalsSubmitted) {
                        handleButtonLeave(e);
                      }
                    }}
                  >
                    {goalsSubmitted ? 'Goals Submitted' : 'Submit Goals'}
                  </button>
                </div>
              </>
            )}

            {/* Play/Pause button and action buttons should only show after goals are submitted */}
            {goalsSubmitted && (
              <>
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={togglePlayback}
                    style={{
                      backgroundColor: '#1a1a1a',
                      border: 'none',
                      color: 'white',
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      fontSize: '24px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                      margin: '0 auto'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = "scale(1.1)";
                      e.currentTarget.style.backgroundColor = "#333333";
                      e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.backgroundColor = "#1a1a1a";
                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
                    }}
                  >
                    {isPlaying ? 
                      <span style={{ fontSize: '28px', position: 'relative', top: '-2px' }}>⏸</span> : 
                      <span style={{ fontSize: '28px', position: 'relative', left: '2px' }}>▶</span>
                    }
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                  <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <button
                      onClick={() => generateAdvice(1)}
                      style={{...buttonStyle, width: "80%", marginBottom: "20px"}}
                      onMouseEnter={handleButtonHover}
                      onMouseLeave={handleButtonLeave}
                      disabled={isLoadingSpeaker1Advice}
                    >
                      {isLoadingSpeaker1Advice ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            border: '3px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '50%',
                            borderTop: '3px solid white',
                            animation: 'spin 1s linear infinite'
                          }}></div>
                          <span>Generating Advice...</span>
                        </div>
                      ) : (
                        "Give Advice"
                      )}
                    </button>

                    <button
                      onClick={() => setShowSpeaker1Transcription(!showSpeaker1Transcription)}
                      style={{
                        ...buttonStyle,
                        width: "80%",
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 0px',
                        backgroundColor: "#1a1a1a",
                        transition: 'background-color 0.3s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
                        e.currentTarget.style.backgroundColor = "#333333";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                        e.currentTarget.style.backgroundColor = "#1a1a1a";
                      }}
                    >
                      <div style={{ width: '60px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '24px',
                          lineHeight: '24px',
                          verticalAlign: 'middle',
                        }}>
                          {showSpeaker1Transcription ? '▼' : '▶'}
                        </span>
                      </div>
                      <div style={{ flex: 1, textAlign: 'left' }}>Transcription</div>
                    </button>
                    
                    {showSpeaker1Transcription && (
                      <div style={{ 
                        marginTop: '10px',
                        width: '80%',
                        textAlign: 'left',
                        transition: 'all 0.3s ease',
                        opacity: showSpeaker1Transcription ? 1 : 0,
                        maxHeight: showSpeaker1Transcription ? '1000px' : '0',
                        overflow: 'hidden'
                      }}>
                        {transcriptions.filter((_, index) => index % 2 === 0).map((transcription, idx) => (
                          <div key={`speaker1-segment-${idx}`} style={{ marginBottom: '20px' }}>
                            <div style={{ 
                              color: '#888', 
                              fontSize: '12px', 
                              marginBottom: '5px' 
                            }}>
                              Segment {idx * 2 + 1} ({Math.round(segments[idx * 2]?.start || 0)}s - {Math.round(segments[idx * 2]?.end || 0)}s)
                            </div>
                            <TextArea text={transcription?.text || 'Transcription in progress...'} />
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => setShowSpeaker1WorldModel(!showSpeaker1WorldModel)}
                      style={{
                        ...buttonStyle,
                        width: "80%",
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 0px',
                        backgroundColor: "#1a1a1a",
                        transition: 'background-color 0.3s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
                        e.currentTarget.style.backgroundColor = "#333333";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                        e.currentTarget.style.backgroundColor = "#1a1a1a";
                      }}
                    >
                      <div style={{ width: '60px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '24px',
                          lineHeight: '24px',
                          verticalAlign: 'middle',
                        }}>
                          {showSpeaker1WorldModel ? '▼' : '▶'}
                        </span>
                      </div>
                      <div style={{ flex: 1, textAlign: 'left' }}>World Model</div>
                    </button>

                    {showSpeaker1WorldModel && (
                      <div style={{ 
                        marginTop: '10px',
                        width: '80%',
                        transition: 'all 0.3s ease',
                        opacity: showSpeaker1WorldModel ? 1 : 0,
                        maxHeight: showSpeaker1WorldModel ? '1000px' : '0',
                        overflow: 'hidden'
                      }}>
                        <WorldModelDisplay worldModel={speaker1WorldModel} />
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <button
                      onClick={() => generateAdvice(2)}
                      style={{...buttonStyle, width: "80%", marginBottom: "20px"}}
                      onMouseEnter={handleButtonHover}
                      onMouseLeave={handleButtonLeave}
                      disabled={isLoadingSpeaker2Advice}
                    >
                      {isLoadingSpeaker2Advice ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            border: '3px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '50%',
                            borderTop: '3px solid white',
                            animation: 'spin 1s linear infinite'
                          }}></div>
                          <span>Generating Advice...</span>
                        </div>
                      ) : (
                        "Give Advice"
                      )}
                    </button>

                    <button
                      onClick={() => setShowSpeaker2Transcription(!showSpeaker2Transcription)}
                      style={{
                        ...buttonStyle,
                        width: "80%",
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 0px',
                        backgroundColor: "#1a1a1a",
                        transition: 'background-color 0.3s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
                        e.currentTarget.style.backgroundColor = "#333333";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                        e.currentTarget.style.backgroundColor = "#1a1a1a";
                      }}
                    >
                      <div style={{ width: '60px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '24px',
                          lineHeight: '24px',
                          verticalAlign: 'middle',
                        }}>
                          {showSpeaker2Transcription ? '▼' : '▶'}
                        </span>
                      </div>
                      <div style={{ flex: 1, textAlign: 'left' }}>Transcription</div>
                    </button>

                    {showSpeaker2Transcription && (
                      <div style={{ 
                        marginTop: '10px',
                        width: '80%',
                        textAlign: 'left',
                        transition: 'all 0.3s ease',
                        opacity: showSpeaker2Transcription ? 1 : 0,
                        maxHeight: showSpeaker2Transcription ? '1000px' : '0',
                        overflow: 'hidden'
                      }}>
                        {transcriptions.filter((_, index) => index % 2 === 1).map((transcription, idx) => (
                          <div key={`speaker2-segment-${idx}`} style={{ marginBottom: '20px' }}>
                            <div style={{ 
                              color: '#888', 
                              fontSize: '12px', 
                              marginBottom: '5px' 
                            }}>
                              Segment {idx * 2 + 2} ({Math.round(segments[idx * 2 + 1]?.start || 0)}s - {Math.round(segments[idx * 2 + 1]?.end || 0)}s)
                            </div>
                            <TextArea text={transcription?.text || 'Transcription in progress...'} />
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => setShowSpeaker2WorldModel(!showSpeaker2WorldModel)}
                      style={{
                        ...buttonStyle,
                        width: "80%",
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 0px',
                        backgroundColor: "#1a1a1a",
                        transition: 'background-color 0.3s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
                        e.currentTarget.style.backgroundColor = "#333333";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                        e.currentTarget.style.backgroundColor = "#1a1a1a";
                      }}
                    >
                      <div style={{ width: '60px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '24px',
                          lineHeight: '24px',
                          verticalAlign: 'middle',
                        }}>
                          {showSpeaker2WorldModel ? '▼' : '▶'}
                        </span>
                      </div>
                      <div style={{ flex: 1, textAlign: 'left' }}>World Model</div>
                    </button>

                    {showSpeaker2WorldModel && (
                      <div style={{ 
                        marginTop: '10px',
                        width: '80%',
                        transition: 'all 0.3s ease',
                        opacity: showSpeaker2WorldModel ? 1 : 0,
                        maxHeight: showSpeaker2WorldModel ? '1000px' : '0',
                        overflow: 'hidden'
                      }}>
                        <WorldModelDisplay worldModel={speaker2WorldModel} />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )
      )}
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
}

export default App;
