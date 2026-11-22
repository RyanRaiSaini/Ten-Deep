import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { POSES, avatarById, type Joint } from './avatars';

const LIMBS: [Joint, Joint][] = [
  ['neck', 'lElbow'], ['lElbow', 'lHand'], ['neck', 'rElbow'], ['rElbow', 'rHand'],
  ['hip', 'lKnee'], ['lKnee', 'lFoot'], ['hip', 'rKnee'], ['rKnee', 'rFoot'],
];

/** Stylized player avatar drawn from pose joints (no real likenesses). */
export function Avatar({ id, size = 56 }: { id: string; size?: number }) {
  const a = avatarById(id);
  const pose = POSES[a.pose];
  const j = pose.joints;
  const { bg, body, jersey, number } = a.palette;
  const [nx, ny] = j.neck;
  const [hx, hy] = j.hip;
  // Jersey: a trapezoid from shoulders to hips.
  const jerseyPts = `${nx - 9},${ny} ${nx + 9},${ny} ${hx + 8},${hy} ${hx - 8},${hy}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={50} fill={bg} />
      <G>
        {LIMBS.map(([p, q]) => (
          <Line key={`${p}-${q}`} x1={j[p][0]} y1={j[p][1]} x2={j[q][0]} y2={j[q][1]} stroke={body} strokeWidth={7} strokeLinecap="round" />
        ))}
        <Polygon points={jerseyPts} fill={jersey} stroke={body} strokeWidth={3} strokeLinejoin="round" />
        <SvgText x={(nx + hx) / 2} y={(ny + hy) / 2 + 5} fontSize={13} fontWeight="900" fill={number} textAnchor="middle">
          {a.number}
        </SvgText>
        <Circle cx={j.head[0]} cy={j.head[1]} r={8.5} fill={body} />
        {pose.extra === 'headband' && (
          <Rect x={j.head[0] - 9} y={j.head[1] - 4} width={18} height={4} rx={2} fill={jersey} />
        )}
        {pose.extra === 'crown' && (
          <Path
            d={`M${j.head[0] - 10} ${j.head[1] - 9} l4 -9 l6 6 l6 -6 l4 9 z`}
            fill="#F5C451" stroke={body} strokeWidth={1.5} strokeLinejoin="round"
          />
        )}
        {pose.ball && (
          <G>
            <Circle cx={pose.ball[0]} cy={pose.ball[1]} r={6.5} fill="#E8833A" stroke={body} strokeWidth={1.8} />
            <Line x1={pose.ball[0] - 6.5} y1={pose.ball[1]} x2={pose.ball[0] + 6.5} y2={pose.ball[1]} stroke={body} strokeWidth={1.2} />
          </G>
        )}
      </G>
    </Svg>
  );
}
