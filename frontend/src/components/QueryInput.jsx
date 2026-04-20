import React, { useState, useRef, useEffect } from "react";

const QueryInput = ({ onSubmit, loading, disabled = false }) => {
  const [inputText, setInputText] = useState("");
  const [validationError, setValidationError] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!loading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [loading]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
    el.style.overflowY = el.scrollHeight > 180 ? "auto" : "hidden";
  };

  const handleChange = (e) => {
    setInputText(e.target.value);
    if (validationError) setValidationError("");
    autoResize();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      setValidationError("Please enter a query");
      return;
    }
    onSubmit(trimmed);
    setInputText("");
    setValidationError("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const isActive = inputText.trim().length > 0 && !loading && !disabled;

  return (
    <div style={{ width: "100%" }}>
      {/* Input container */}
      <div
        style={{
          position: "relative",
          background: "var(--color-background-secondary)",
          border: validationError
            ? "0.5px solid var(--color-border-danger)"
            : "0.5px solid var(--color-border-secondary)",
          borderRadius: "50px",
          padding: "12px 52px 12px 16px",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => {
          if (!validationError)
            e.currentTarget.style.borderColor = "var(--color-border-primary)";
        }}
        onBlur={(e) => {
          if (!validationError)
            e.currentTarget.style.borderColor = "var(--color-border-secondary)";
        }}
      >
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={loading || disabled}
          placeholder="Ask a business question"
          aria-label="Query input"
          aria-invalid={!!validationError}
          aria-describedby={validationError ? "query-error" : undefined}
          rows={1}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            fontFamily: "var(--font-sans)",
            fontSize: "15px",
            lineHeight: "1.6",
            color: "var(--color-text-primary)",
            minHeight: "24px",
            maxHeight: "180px",
            overflowY: "hidden",
            display: "block",
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={!isActive}
          aria-label="Send query"
          style={{
            position: "absolute",
            right: "10px",
            bottom: "10px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "none",
            cursor: isActive ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.15s, transform 0.1s",
            background: isActive
              ? "var(--color-text-primary)"
              : "var(--color-background-tertiary)",
            color: isActive
              ? "var(--color-background-primary)"
              : "var(--color-text-tertiary)",
            opacity: loading || disabled ? 0.45 : 1,
          }}
          onMouseDown={(e) => {
            if (isActive) e.currentTarget.style.transform = "scale(0.92)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {loading ? (
            <span
              style={{
                width: "14px",
                height: "14px",
                border: "2px solid transparent",
                borderTopColor: "currentColor",
                borderRadius: "50%",
                display: "block",
                animation: "qi-spin 0.7s linear infinite",
              }}
            />
          ) : (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          )}
        </button>
      </div>

      {/* Validation error */}
      {validationError && (
        <p
          id="query-error"
          role="alert"
          style={{
            fontSize: "13px",
            color: "var(--color-text-danger)",
            marginTop: "6px",
            paddingLeft: "4px",
          }}
        >
          {validationError}
        </p>
      )}

      {/* Keyboard hint */}
      <p
        style={{
          textAlign: "center",
          fontSize: "12px",
          color: "var(--color-text-tertiary)",
          marginTop: "8px",
        }}
      >
        <kbd
          style={{
            background: "var(--color-background-secondary)",
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: "4px",
            padding: "1px 5px",
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
          }}
        >
          Enter
        </kbd>{" "}
        to send &nbsp;·&nbsp;{" "}
        <kbd
          style={{
            background: "var(--color-background-secondary)",
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: "4px",
            padding: "1px 5px",
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
          }}
        >
          Shift+Enter
        </kbd>{" "}
        for new line
      </p>

      {/* Spinner keyframe */}
      <style>{`@keyframes qi-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default QueryInput;
