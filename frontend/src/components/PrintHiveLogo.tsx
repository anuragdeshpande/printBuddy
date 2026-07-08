

interface PrintHiveLogoProps {
  className?: string;
  showText?: boolean;
}

export function PrintHiveLogo({ className = 'h-8', showText = true }: PrintHiveLogoProps) {
  return (
    <svg 
      className={className} 
      viewBox={showText ? "0 0 1129 427" : "0 0 427 427"}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Icon Group */}
      <g transform={showText ? "translate(0, 0)" : "translate(13.5, 0)"}>
        {/* Hexagon Outer Border - dynamic accent color */}
        <polygon 
          points="200,53 338,133 338,293 200,373 62,293 62,133" 
          fill="none" 
          stroke="var(--accent)" 
          strokeWidth="24" 
          strokeLinejoin="round"
        />
        
        {/* Isometric Cube Faces - dynamic orange shades based on accent */}
        {/* Top Face: Accent light */}
        <polygon points="200,223 269,183 200,143 131,183" fill="var(--accent-light)"/>
        {/* Left Face: Accent dark */}
        <polygon points="200,223 131,183 131,263 200,303" fill="var(--accent-dark)"/>
        {/* Right Face: Main accent */}
        <polygon points="200,223 269,183 269,263 200,303" fill="var(--accent)"/>
        
        {/* Nozzle and Filament */}
        <polygon points="190,90 210,90 200,110" fill="var(--text-primary, #ffffff)"/>
        <line x1="200" y1="110" x2="200" y2="143" stroke="var(--accent-light)" strokeWidth="6" strokeDasharray="6 4"/>
      </g>

      {/* Typography - text-primary color or white */}
      {showText && (
        <text 
          x="400" 
          y="265" 
          fontFamily="Inter, system-ui, -apple-system, sans-serif" 
          fontWeight="900" 
          fontSize="145" 
          fill="var(--text-primary, #ffffff)" 
          letterSpacing="-2"
        >
          Print<tspan fill="var(--accent)">Hive</tspan>
        </text>
      )}
    </svg>
  );
}
