/**
 * Illustrations for the Management Crisis hub banners, drawn in SVG so they're crisp at any size and need no image
 * files. Crisis Season: a press room in meltdown (flashbulbs, a wall of microphones, siren beams). Takeover: a city
 * at night with the arena lit up, the purchase contract and the keys to the franchise.
 */
import Svg, { Circle, Defs, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

const W = 400;
const H = 220;

/** A camera flash: a bright core, a soft glow and a four-point star. */
function Flash({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={r * 2.6} fill="url(#flashGlow)" />
      <Polygon points={`${x},${y - r * 2} ${x + r * 0.35},${y - r * 0.35} ${x + r * 2},${y} ${x + r * 0.35},${y + r * 0.35} ${x},${y + r * 2} ${x - r * 0.35},${y + r * 0.35} ${x - r * 2},${y} ${x - r * 0.35},${y - r * 0.35}`} fill="#FFF7D6" />
      <Circle cx={x} cy={y} r={r * 0.55} fill="#FFFFFF" />
    </G>
  );
}

/** A press microphone on a stand, tilted toward the podium. */
function Mic({ x, y, tilt, flag }: { x: number; y: number; tilt: number; flag: string }) {
  return (
    <G transform={`rotate(${tilt} ${x} ${y + 60})`}>
      <Rect x={x - 2.5} y={y + 14} width={5} height={70} fill="#120A0E" />
      <Rect x={x - 9} y={y + 16} width={18} height={13} rx={2} fill={flag} />
      <Rect x={x - 8} y={y - 14} width={16} height={30} rx={8} fill="#1C1218" />
      <Rect x={x - 6} y={y - 11} width={12} height={10} rx={5} fill="#3A2A33" />
    </G>
  );
}

export function CrisisArt({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="crisisBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2A0710" />
          <Stop offset="0.55" stopColor="#8E1426" />
          <Stop offset="1" stopColor="#FF5A36" />
        </LinearGradient>
        <RadialGradient id="flashGlow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#FFF4C2" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#FFF4C2" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF2E3E" stopOpacity="0.75" />
          <Stop offset="1" stopColor="#FF2E3E" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect width={W} height={H} fill="url(#crisisBg)" />
      {/* Siren beams sweeping down from the top right */}
      <Path d="M330 0 L250 220 L330 220 Z" fill="url(#beam)" opacity={0.55} />
      <Path d="M330 0 L400 160 L400 0 Z" fill="url(#beam)" opacity={0.4} />
      <Circle cx={330} cy={6} r={16} fill="#FF2E3E" />
      <Circle cx={330} cy={6} r={8} fill="#FFD1D6" />
      {/* Crowd of reporters, in silhouette */}
      <G fill="#1A0B10" opacity={0.9}>
        {[20, 62, 104, 146, 188, 230, 272, 314, 356, 398].map((x, i) => (
          <G key={x}>
            <Circle cx={x} cy={172 + (i % 2) * 6} r={17} />
            <Rect x={x - 26} y={186 + (i % 2) * 6} width={52} height={40} rx={18} />
          </G>
        ))}
      </G>
      {/* Raised cameras */}
      <G fill="#0E0609">
        <Rect x={44} y={128} width={34} height={22} rx={4} />
        <Rect x={70} y={134} width={12} height={10} rx={3} />
        <Rect x={238} y={122} width={34} height={22} rx={4} />
        <Rect x={230} y={128} width={12} height={10} rx={3} />
      </G>
      <Flash x={60} y={126} r={11} />
      <Flash x={256} y={120} r={13} />
      <Flash x={156} y={58} r={7} />
      <Flash x={372} y={96} r={8} />
      {/* The wall of microphones */}
      <Mic x={168} y={96} tilt={-14} flag="#2F6BFF" />
      <Mic x={186} y={88} tilt={-6} flag="#FFC53D" />
      <Mic x={204} y={86} tilt={2} flag="#18C08A" />
      <Mic x={222} y={92} tilt={10} flag="#FFFFFF" />
      <Mic x={240} y={100} tilt={18} flag="#FF7417" />
      {/* Breaking-news ticker */}
      <Rect x={0} y={206} width={W} height={14} fill="#FFC53D" />
      <G fill="#17121E">
        {Array.from({ length: 14 }, (_, i) => <Rect key={i} x={i * 30 + 6} y={210} width={18} height={6} rx={2} />)}
      </G>
    </Svg>
  );
}

export function TakeoverArt({ width, height }: { width: number; height: number }) {
  const windows = [
    [14, 120, 34, 100], [56, 96, 28, 124], [92, 132, 40, 88], [300, 104, 30, 116], [338, 84, 26, 136], [370, 124, 34, 96],
  ];
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0A1024" />
          <Stop offset="0.6" stopColor="#1B3A7A" />
          <Stop offset="1" stopColor="#3F6BFF" />
        </LinearGradient>
        <LinearGradient id="spot" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#CFE0FF" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#CFE0FF" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE58A" />
          <Stop offset="0.5" stopColor="#FFC53D" />
          <Stop offset="1" stopColor="#C98A00" />
        </LinearGradient>
      </Defs>
      <Rect width={W} height={H} fill="url(#sky)" />
      {/* Stars */}
      <G fill="#FFFFFF">
        {[[30, 20], [80, 40], [130, 14], [210, 30], [260, 12], [320, 34], [372, 18], [180, 52], [110, 66]].map(([x, y]) => (
          <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} opacity={0.8} />
        ))}
      </G>
      {/* Searchlights from the arena */}
      <Path d="M190 150 L120 0 L150 0 Z" fill="url(#spot)" />
      <Path d="M210 150 L280 0 L250 0 Z" fill="url(#spot)" />
      {/* Skyline */}
      <G fill="#0B1430">
        {windows.map(([x, y, w, h]) => <Rect key={`${x}`} x={x} y={y} width={w} height={h} />)}
      </G>
      <G fill="#FFD36B" opacity={0.85}>
        {windows.flatMap(([x, y, w, h]) =>
          Array.from({ length: Math.floor((h - 10) / 14) }, (_, r) => Array.from({ length: Math.floor((w - 6) / 10) }, (_, c) =>
            ((r * 7 + c * 3 + x) % 5 !== 0 ? null : <Rect key={`${x}-${r}-${c}`} x={x + 5 + c * 10} y={y + 8 + r * 14} width={5} height={6} />))).flat())}
      </G>
      {/* The arena */}
      <Path d="M120 220 L120 160 Q200 110 280 160 L280 220 Z" fill="#101C44" />
      <Path d="M132 166 Q200 124 268 166" stroke="#7FB0FF" strokeWidth={3} fill="none" />
      <Rect x={150} y={176} width={100} height={8} rx={4} fill="#FF7417" />
      {/* The purchase agreement, signed */}
      <G transform="rotate(-10 92 160)">
        <Rect x={46} y={118} width={86} height={100} rx={6} fill="#FFFDF7" />
        {[0, 1, 2, 3, 4].map((i) => <Rect key={i} x={56} y={132 + i * 11} width={i === 4 ? 40 : 66} height={4} rx={2} fill="#C9D3E6" />)}
        <Path d="M58 196 q10 -14 20 0 t20 0 t16 -4" stroke="#2F6BFF" strokeWidth={3} fill="none" strokeLinecap="round" />
      </G>
      {/* The keys to the franchise */}
      <G transform="rotate(-28 318 170)">
        <Circle cx={292} cy={170} r={26} fill="url(#gold)" />
        <Circle cx={292} cy={170} r={11} fill="#1B3A7A" />
        <Rect x={314} y={164} width={74} height={12} rx={4} fill="url(#gold)" />
        <Rect x={360} y={176} width={9} height={14} rx={2} fill="url(#gold)" />
        <Rect x={374} y={176} width={9} height={20} rx={2} fill="url(#gold)" />
      </G>
    </Svg>
  );
}
