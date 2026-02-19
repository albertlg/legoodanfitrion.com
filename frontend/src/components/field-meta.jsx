function FieldMeta({ helpText, errorText, helpId, errorId }) {
  return (
    <div className="field-meta">
      {helpText ? (
        <p id={helpId} className="field-help">
          {helpText}
        </p>
      ) : null}
      {errorText ? (
        <p id={errorId} className="field-error" role="alert">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}

export { FieldMeta };

