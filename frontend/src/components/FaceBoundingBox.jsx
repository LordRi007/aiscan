import React from 'react';
import { ShieldCheck, UserCheck, AlertCircle, Sparkles } from 'lucide-react';
import { faceService } from '../services/faceService';

export default function FaceBoundingBox({
  face,
  containerWidth,
  containerHeight,
  naturalWidth = 640,
  naturalHeight = 360,
  isMirrored = false,
}) {
  if (!face || !face.bbox) return null;

  const [bx, by, bw, bh] = face.bbox;

  // Compute exact object-cover rendering geometry to eliminate aspect ratio drift
  const videoW = naturalWidth || 640;
  const videoH = naturalHeight || 360;
  const videoAspect = videoW / (videoH || 1);
  const containerAspect = containerWidth / (containerHeight || 1);

  let renderWidth, renderHeight, offsetX, offsetY;

  if (containerAspect > videoAspect) {
    // Container is wider than video: video fills width and is vertically centered/cropped
    renderWidth = containerWidth;
    renderHeight = containerWidth / videoAspect;
    offsetX = 0;
    offsetY = (renderHeight - containerHeight) / 2;
  } else {
    // Container is taller than video: video fills height and is horizontally centered/cropped
    renderHeight = containerHeight;
    renderWidth = containerHeight * videoAspect;
    offsetY = 0;
    offsetX = (renderWidth - containerWidth) / 2;
  }

  const scale = renderWidth / videoW;

  // Mirror-aware pixel-perfect composite coordinates
  const left = isMirrored
    ? Math.round((videoW - bx - bw) * scale - offsetX)
    : Math.round(bx * scale - offsetX);

  const top = Math.round(by * scale - offsetY);
  const width = Math.round(bw * scale);
  const height = Math.round(bh * scale);

  // Status-based colors according to specification
  const getStyleProps = () => {
    switch (face.box_color) {
      case 'green':
        return {
          border: 'border-emerald-500 shadow-emerald-500/40',
          badgeBg: 'bg-emerald-600 text-white',
          indicator: 'Registered Person',
          icon: ShieldCheck,
        };
      case 'blue':
        return {
          border: 'border-blue-500 shadow-blue-500/40',
          badgeBg: 'bg-blue-600 text-white',
          indicator: 'New Person Registered',
          icon: Sparkles,
        };
      case 'gray':
        return {
          border: 'border-gray-400 shadow-gray-500/30',
          badgeBg: 'bg-gray-700 text-gray-200',
          indicator: 'Verification Required',
          icon: AlertCircle,
        };
      case 'yellow':
      default:
        return {
          border: 'border-amber-400 shadow-amber-500/40',
          badgeBg: 'bg-amber-600 text-white',
          indicator: 'Checking Registration...',
          icon: UserCheck,
        };
    }
  };

  const style = getStyleProps();
  const IconComponent = style.icon;
  const exprColor = faceService.getExpressionColor(face.expression);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate3d(${left}px, ${top}px, 0)`,
        pointerEvents: 'none',
        willChange: 'transform, width, height',
      }}
      className={`border-2 rounded-xl shadow-lg ${style.border}`}
    >
      {/* Top Banner: Identity & Verification Status */}
      <div
        className={`absolute -top-7 left-0 flex items-center gap-1.5 px-2 py-0.5 rounded-t-lg text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-md ${style.badgeBg}`}
      >
        <IconComponent className="w-3 h-3" />
        <span>{face.person_name || face.person_id || style.indicator}</span>
        {face.match_confidence > 0 && (
          <span className="opacity-80 text-[10px] font-mono">({face.match_confidence}%)</span>
        )}
      </div>

      {/* Bottom Banner: Tentative Facial Expression with Emoji & AU Confidence */}
      <div
        className="absolute -bottom-8 left-0 flex items-center gap-1.5 px-2.5 py-1 rounded-b-lg text-[11px] font-semibold bg-gray-950/90 text-white border border-gray-700 shadow-xl whitespace-nowrap backdrop-blur-md"
      >
        <span className="text-base leading-none select-none">
          {face.expression_emoji || faceService.getExpressionEmoji(face.expression)}
        </span>
        <span className="font-semibold text-gray-100">{face.expression || 'Neutral'}</span>
        <span className="text-gray-400 font-mono text-[10px]">({face.expression_confidence || 75}%)</span>
      </div>

      {/* Corner crosshairs */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/80" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white/80" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white/80" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/80" />
    </div>
  );
}
