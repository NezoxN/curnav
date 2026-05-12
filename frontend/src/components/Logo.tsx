import React from 'react';
import LogoSvg from '../assets/Logo.svg';
interface LogoProps {
  size?: number | string;
  className?: string;
  isSystem?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 32, className }) => {
  return (
    <img
      src={LogoSvg}
      alt="CurriNav Logo"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
};

export default Logo;
