import { useState } from "react";

function BrandMark({ text, fallback }) {
  const sources = ["/brand/logo-legoodanfitrion-icon.png", "/brand/logo-legoodanfitrion.png"];
  const [sourceIndex, setSourceIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  const handleError = () => {
    if (sourceIndex < sources.length - 1) {
      setSourceIndex((previous) => previous + 1);
      return;
    }
    setImgError(true);
  };

  return (
    <div className="brand-mark">
      {imgError ? (
        <div className="brand-fallback" aria-label={text}>
          {fallback}
        </div>
      ) : (
        <img
          className="brand-logo"
          src={sources[sourceIndex]}
          alt={text}
          onError={handleError}
        />
      )}
    </div>
  );
}

export { BrandMark };
