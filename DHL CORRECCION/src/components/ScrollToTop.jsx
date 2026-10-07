
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useLayoutEffect } from 'react';

function ScrollToTop() {
  const location = useLocation();
  
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  return null;
}

export default ScrollToTop;
