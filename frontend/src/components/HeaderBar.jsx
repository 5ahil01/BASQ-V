import React from "react";
import PropTypes from "prop-types";

/**
 * HeaderBar Component
 * Project title and subtitle (no login/logout - out of scope)
 */
const HeaderBar = ({ title, subtitle }) => {
  return (
    <div className="text-left mb-5 pl-2 animate-fade-in-down">
      <div className="header-content">
        <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold m-0 py-3 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text tracking-tight animate-title-glow border-b-0 leading-tight">
          {title || "BASQ-V"}
        </h1>
        {subtitle && (
          <p className="text-slate-300 text-lg sm:text-xl font-medium mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

HeaderBar.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
};

HeaderBar.defaultProps = {
  title: "BASQ-V",
  subtitle: "Business-Aware Self-Reflective RAG Analytics",
};

export default HeaderBar;
