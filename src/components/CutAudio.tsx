import React, { useState, useRef, useEffect } from 'react';
import './CutAudio.css';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

interface CutPoint {
  position: number;
  id: number;
}

interface CutAudioProps {
  width?: number;
  height?: number;
  audioUrl?: string;
}

const CutAudio: React.FC<CutAudioProps> = ({ 
  width = 800, 
  height = 120,
  audioUrl
}) => {
  const [cutPoints, setCutPoints] = useState<CutPoint[]>([]);
  const [isDragging, setIsDragging] = useState<number | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!audioUrl) return;

    const drawWaveform = async () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      
      const blockSize = Math.floor(channelData.length / width);
      const sampledData = [];
      
      const amplitudeMultiplier = 2.5;
      
      for (let i = 0; i < width; i++) {
        const blockStart = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[blockStart + j]);
        }
        sampledData.push((sum / blockSize) * amplitudeMultiplier);
      }

      setWaveformData(sampledData);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);
      
      // First fill the area between the lines
      ctx.beginPath();
      
      // Draw top line from left to right
      sampledData.forEach((point, i) => {
        const x = i;
        const y = (height / 2) - ((point * height) / 2);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      // Draw bottom line from right to left
      for (let i = sampledData.length - 1; i >= 0; i--) {
        const x = i;
        const y = (height / 2) + ((sampledData[i] * height) / 2);
        ctx.lineTo(x, y);
      }

      // Close the path and fill with grey
      ctx.closePath();
      ctx.fillStyle = 'rgba(74, 85, 104, 0.2)';
      ctx.fill();

      // Now draw the lines on top
      ctx.strokeStyle = '#4a5568';
      ctx.lineWidth = 2;
      
      // Draw top line
      ctx.beginPath();
      sampledData.forEach((point, i) => {
        const x = i;
        const y = (height / 2) - ((point * height) / 2);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw bottom line
      ctx.beginPath();
      sampledData.forEach((point, i) => {
        const x = i;
        const y = (height / 2) + ((point * height) / 2);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    };

    drawWaveform();
  }, [audioUrl, width, height]);

  const handleContainerClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;

    if (e.shiftKey) {
      // Add cut point when holding Shift
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
      // Regular click controls playback position
      if (!audioRef.current || isDragging) return;
      audioRef.current.currentTime = position * audioRef.current.duration;
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
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime / audioRef.current.duration);
      animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
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

  return (
    <div className="audio-editor">
      <div 
        ref={containerRef}
        className="cut-audio-container"
        onClick={handleContainerClick}
        onMouseMove={handleMouseMove}
        style={{ width, height }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="waveform-canvas"
        />
        
        <div className="cut-audio-line" />
        
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
                className="cut-audio-section"
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

      {/* Audio controls */}
      <div className="audio-controls">
        <button 
          className={`play-button ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlayback}
        >
          {isPlaying ? '⏸' : '▶️'}
        </button>
        <div className="cut-instructions">
          Hold Shift + Click to add cut points
        </div>
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id="clear-cuts-tooltip">
              Are you sure you want to delete?
            </Tooltip>
          }
        >
          <button 
            className="clear-button"
            onClick={handleClearCutPoints}
            disabled={cutPoints.length === 0}
          >
            Clear Cuts
          </button>
        </OverlayTrigger>
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      </div>
    </div>
  );
};

export default CutAudio; 