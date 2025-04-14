import React, { useState, useRef, useEffect } from 'react';
import './CutVideo.css';

interface CutPoint {
  position: number;
  id: number;
}

interface CutVideoProps {
  width?: number;
  height?: number;
  videoUrl: string;
  onSegmentsChange?: (segments: { start: number; end: number; }[]) => void;
  onSegmentComplete?: () => void;
}

const CutVideo: React.FC<CutVideoProps> = ({ 
  width = 800, 
  height = 450,
  videoUrl,
  onSegmentsChange,
  onSegmentComplete
}) => {
  const [cutPoints, setCutPoints] = useState<CutPoint[]>([]);
  const [isDragging, setIsDragging] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isSegmenting, setIsSegmenting] = useState(false);

  const handleContainerClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;

    if (e.shiftKey) {
      const tooClose = cutPoints.some(point => 
        Math.abs(point.position - position) < 0.02
      );
      
      if (!tooClose) {
        setCutPoints(prev => [
          ...prev, 
          { position, id: Date.now() }
        ].sort((a, b) => a.position - b.position));
      }
    } else {
      if (!videoRef.current || isDragging) return;
      videoRef.current.currentTime = position * videoRef.current.duration;
    }
  };

  const handleMouseDown = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setIsDragging(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging === null || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    setCutPoints(prev => 
      prev.map(point => 
        point.id === isDragging 
          ? { ...point, position } 
          : point
      ).sort((a, b) => a.position - b.position)
    );
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const updatePlaybackPosition = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime / videoRef.current.duration);
      animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
    }
  };

  const togglePlayback = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const handleClearCutPoints = () => {
    setCutPoints([]);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, []);

  useEffect(() => {
    if (!onSegmentsChange || !videoDuration) return;
    
    const segments = [];
    
    // Sort cut points by position
    const sortedPoints = [...cutPoints].sort((a, b) => a.position - b.position);
    
    // Add segments in alternating order
    if (sortedPoints.length > 0) {
      // First segment (start to first orange)
      segments.push({
        start: 0,
        end: sortedPoints[0].position * videoDuration
      });

      for (let i = 0; i < sortedPoints.length - 1; i += 2) {
        // Orange area
        if (i + 1 < sortedPoints.length) {
          segments.push({
            start: sortedPoints[i].position * videoDuration,
            end: sortedPoints[i + 1].position * videoDuration
          });

          // Gap to next orange area (if exists)
          if (i + 2 < sortedPoints.length) {
            segments.push({
              start: sortedPoints[i + 1].position * videoDuration,
              end: sortedPoints[i + 2].position * videoDuration
            });
          }
        }
      }

      // Last segment (last orange to end)
      if (sortedPoints[sortedPoints.length - 1].position < 1) {
        segments.push({
          start: sortedPoints[sortedPoints.length - 1].position * videoDuration,
          end: videoDuration
        });
      }
    }
    
    // Log segments to verify alternation
    console.log('Created segments:', segments);
    
    onSegmentsChange(segments);
  }, [cutPoints, onSegmentsChange, videoDuration]);

  const parseMultipartResponse = async (response: Response) => {
    const contentType = response.headers.get('Content-Type');
    if (!contentType) throw new Error('No content type in response');

    // Get the boundary from content type
    const boundaryMatch = contentType.match(/boundary=(.*)/);
    if (!boundaryMatch) throw new Error('No boundary found in content type');
    const boundary = boundaryMatch[1];

    // Get response as array buffer
    const buffer = await response.arrayBuffer();

    // Convert the buffer to Uint8Array
    const data = new Uint8Array(buffer);
    
    // Convert to string to find boundaries
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(data);
    
    // Find the speaker1.mp4 section
    const speaker1Start = text.indexOf('filename="speaker1.mp4"');
    if (speaker1Start === -1) throw new Error('Speaker1 video not found in response');
    
    // Find the start of video data (after headers)
    const headerEnd = text.indexOf('\r\n\r\n', speaker1Start);
    if (headerEnd === -1) throw new Error('Could not find video data start');
    const videoStart = headerEnd + 4;
    
    // Find the end of video data (next boundary)
    const videoEnd = text.indexOf('--' + boundary, videoStart);
    if (videoEnd === -1) throw new Error('Could not find video data end');
    
    // Extract the video data
    const videoData = data.slice(videoStart, videoEnd - 2); // -2 to remove \r\n
    
    // Create blob from the video data
    const videoBlob = new Blob([videoData], { type: 'video/mp4' });
    
    // Create and return URL
    return URL.createObjectURL(videoBlob);
  };

  const handleSegmentVideo = () => {
    if (onSegmentComplete) {
      onSegmentComplete();
    }
  };

  // Add button style objects
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
    margin: "0 5px",
  };

  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.currentTarget.disabled) return;
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
    if (e.currentTarget.style.backgroundColor.includes("dc3545")) {
      e.currentTarget.style.backgroundColor = "#c82333";
    } else {
      e.currentTarget.style.backgroundColor = "#0056b3";
    }
  };

  const handleButtonLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.currentTarget.disabled) return;
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
    if (e.currentTarget.style.backgroundColor.includes("c82333")) {
      e.currentTarget.style.backgroundColor = "#dc3545";
    } else {
      e.currentTarget.style.backgroundColor = "#007bff";
    }
  };

  return (
    <div className="video-editor">
      <video 
        ref={videoRef}
        src={videoUrl}
        style={{ display: 'none' }}
      />
      <div 
        ref={containerRef}
        className="cut-video-container"
        onClick={handleContainerClick}
        onMouseMove={handleMouseMove}
        style={{ width, height }}
      >
        <video
          ref={videoRef}
          width={width}
          height={height}
          src={videoUrl}
          className="video-element"
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
        
        {/* Playback position indicator */}
        <div 
          className="playback-position"
          style={{ left: `${currentTime * 100}%` }}
        />
        
        {/* Cut points and sections */}
        {cutPoints.map((point, index) => {
          if (index % 2 === 0 && index + 1 < cutPoints.length) {
            const width = `${(cutPoints[index + 1].position - point.position) * 100}%`;
            const left = `${point.position * 100}%`;
            return (
              <div
                key={`section-${point.id}`}
                className="cut-video-section"
                style={{ left, width }}
              />
            );
          }
          return null;
        })}
        
        {cutPoints.map((point) => (
          <div
            key={point.id}
            className={`cut-point ${isDragging === point.id ? 'dragging' : ''}`}
            style={{ left: `${point.position * 100}%` }}
            onMouseDown={(e) => handleMouseDown(e, point.id)}
          />
        ))}
      </div>

      {/* Video controls */}
      <div className="video-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '15px' }}>
        <button 
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: 'white',
            width: '40px',
            height: '40px',
            padding: '8px',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease',
          }}
          onClick={togglePlayback}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {isPlaying ? '⏸' : '▶️'}
        </button>
        
        <div className="cut-instructions" style={{
          margin: '0 15px',
          padding: '8px 15px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          color: '#fff'
        }}>
          Hold Shift + Click to add cut points
        </div>
        
        <button 
          style={{
            ...buttonStyle,
            backgroundColor: "#dc3545",
            opacity: cutPoints.length === 0 ? 0.6 : 1,
            cursor: cutPoints.length === 0 ? 'not-allowed' : 'pointer',
            padding: "8px 16px",
            fontSize: "14px",
          }}
          onClick={handleClearCutPoints}
          disabled={cutPoints.length === 0}
          onMouseEnter={handleButtonHover}
          onMouseLeave={handleButtonLeave}
        >
          Clear Cuts
        </button>
        
        <button 
          style={{
            ...buttonStyle,
            opacity: isSegmenting || cutPoints.length === 0 ? 0.6 : 1,
            cursor: isSegmenting || cutPoints.length === 0 ? 'not-allowed' : 'pointer',
          }}
          onClick={handleSegmentVideo}
          disabled={isSegmenting || cutPoints.length === 0}
          onMouseEnter={handleButtonHover}
          onMouseLeave={handleButtonLeave}
        >
          {isSegmenting ? 'Segmenting...' : 'Segment Video'}
        </button>
      </div>
    </div>
  );
};

export default CutVideo; 