import React from "react";
import { Step } from "./api";

export interface DiffHandlerProps {
  leftStep?: Step | null;
  rightStep?: Step | null;
  status: string;
}

export interface DiffHandler {
  name: string;
  canHandle: (left?: Step | null, right?: Step | null) => boolean;
  component: React.ComponentType<DiffHandlerProps>;
}

// Example: Image Diff Handler (Stub for now, just detects images)
export const ImageDiffHandler: DiffHandler = {
  name: "Image Diff",
  canHandle: (left, right) => {
    const hasImage = (s?: Step | null) => {
      const p = s?.payload;
      if (!p) return false;
      return !!(p.image_url || p.base64_image || p.image);
    };
    return hasImage(left) || hasImage(right);
  },
  component: ({ leftStep, rightStep, status }) => {
    const getImageUrl = (s?: Step | null) => {
      const p = s?.payload;
      if (!p) return null;
      return p.image_url || p.base64_image || p.image;
    };

    const leftImg = getImageUrl(leftStep);
    const rightImg = getImageUrl(rightStep);

    return (
      <div className="p-4 grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-[10px] text-gray-500 uppercase font-bold">Original (Left)</div>
          {leftImg ? (
            <img src={leftImg} alt="Left" className="max-w-full rounded border border-gray-800" />
          ) : (
            <div className="h-32 bg-gray-900 rounded border border-gray-800 flex items-center justify-center text-xs text-gray-600">No Image</div>
          )}
        </div>
        <div className="space-y-2">
          <div className="text-[10px] text-gray-500 uppercase font-bold">New (Right)</div>
          {rightImg ? (
            <img src={rightImg} alt="Right" className="max-w-full rounded border border-gray-800" />
          ) : (
            <div className="h-32 bg-gray-900 rounded border border-gray-800 flex items-center justify-center text-xs text-gray-600">No Image</div>
          )}
        </div>
      </div>
    );
  },
};

// Example: JSON Path Exclusion Handler
// This one wraps the default diff but filters the payload first
export function createJsonFilterHandler(name: string, excludedKeys: string[]): DiffHandler {
  return {
    name,
    canHandle: (left, right) => {
      const p = left?.payload || right?.payload;
      if (!p) return false;
      return excludedKeys.some(k => k in p);
    },
    component: ({ leftStep, rightStep, status }) => {
      const filter = (obj: any) => {
        if (!obj || typeof obj !== "object") return obj;
        const newObj = { ...obj };
        for (const key of excludedKeys) {
          delete newObj[key];
        }
        return newObj;
      };

      const leftPayload = filter(leftStep?.payload);
      const rightPayload = filter(rightStep?.payload);

      const leftJson = JSON.stringify(leftPayload, null, 2);
      const rightJson = JSON.stringify(rightPayload, null, 2);

      // In a real implementation, we might want to use the same Myers diff here.
      // But for simplicity in this handler, we just show filtered JSON.
      return (
        <div className="p-4 bg-gray-950 text-[10px] font-mono whitespace-pre overflow-x-auto">
          <div className="text-gray-500 mb-2 italic">// Filtered keys: {excludedKeys.join(", ")}</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-600 mb-1 font-bold">LEFT (Filtered)</div>
              <div className="text-gray-400">{leftJson}</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1 font-bold">RIGHT (Filtered)</div>
              <div className="text-gray-400">{rightJson}</div>
            </div>
          </div>
        </div>
      );
    },
  };
}

// The registry
export const diffHandlers: DiffHandler[] = [
  ImageDiffHandler,
  createJsonFilterHandler("Noise Filter", ["timestamp", "id", "created_at", "updated_at"]),
];

export function getHandler(left?: Step | null, right?: Step | null): DiffHandler | null {
  for (const handler of diffHandlers) {
    if (handler.canHandle(left, right)) {
      return handler;
    }
  }
  return null;
}
