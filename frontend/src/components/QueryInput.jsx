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
    // Removed setInputText("") here to keep the query in the input
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
            ? "1px solid var(--color-border-danger)"
            : "1px solid transparent",
          borderRadius: "26px",
          padding: "14px 52px 14px 56px",
          boxShadow: validationError
            ? "none"
            : "0 2px 10px rgba(0, 0, 0, 0.15)",
          transition: "box-shadow 0.2s, border-color 0.2s, background 0.2s",
        }}
        onFocus={(e) => {
          if (!validationError) {
            e.currentTarget.style.background =
              "var(--color-background-primary)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.25)";
          }
        }}
        onBlur={(e) => {
          if (!validationError) {
            e.currentTarget.style.background =
              "var(--color-background-secondary)";
            e.currentTarget.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.15)";
          }
        }}
      >
        {/* Plus / Attachment icon mimicking Gemini */}
        <button
          disabled={loading || disabled}
          aria-label="Add attachment"
          style={{
            position: "absolute",
            left: "14px",
            bottom: "12px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "none",
            background: "transparent",
            color: "var(--color-text-tertiary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!disabled && !loading) {
              e.currentTarget.style.background =
                "var(--color-border-secondary)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled && !loading) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-text-tertiary)";
            }
          }}
        ></button>

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
            fontSize: "16px",
            lineHeight: "1.5",
            color: "var(--color-text-primary)",
            minHeight: "24px",
            maxHeight: "180px",
            overflowY: "hidden",
            display: "block",
            paddingTop: "4px",
          }}
        />

        {/* Send button (Gemini-esque upward arrow) */}
        <button
          onClick={handleSubmit}
          disabled={!isActive}
          aria-label="Send query"
          style={{
            position: "absolute",
            right: "12px",
            bottom: "12px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "none",
            cursor: isActive ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.2s, transform 0.1s, color 0.2s",
            background: isActive
              ? "var(--color-text-primary)"
              : "var(--color-background-tertiary)",
            color: isActive
              ? "var(--color-background-primary)"
              : "var(--color-text-tertiary)",
            opacity: loading || disabled ? 0.45 : 1,
            boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
          }}
          onMouseDown={(e) => {
            if (isActive) e.currentTarget.style.transform = "scale(0.9)";
          }}
          onMouseUp={(e) => {
            if (isActive) e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {loading ? (
            <span
              style={{
                width: "16px",
                height: "16px",
                border: "2px solid transparent",
                borderLeftColor: "currentColor",
                borderTopColor: "currentColor",
                borderRadius: "50%",
                display: "block",
                animation: "qi-spin 0.6s linear infinite",
              }}
            />
          ) : (
            <svg
              width="16"
              height="16"
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
