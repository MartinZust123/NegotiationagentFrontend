import React, { useEffect, useRef } from 'react';

interface TextAreaProps {
  text: string;
}

const TextArea: React.FC<TextAreaProps> = ({ text }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      // Set the height to match the content
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  return (
    <textarea
      ref={textareaRef}
      value={text}
      readOnly
      style={{
        width: '100%',
        minHeight: '50px',
        marginTop: '10px',
        padding: '10px',
        backgroundColor: '#2b2b2b',
        color: 'white',
        border: '1px solid #444',
        borderRadius: '4px',
        resize: 'none',
        overflow: 'hidden',
      }}
    />
  );
};

export default TextArea; 