import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { PanResponder, View } from "react-native";

export type DrawingCanvasRef = {
  clear: () => void;
  hasDrawing: () => boolean;
};

const DrawingCanvas = forwardRef<DrawingCanvasRef>((_, ref) => {
  const drawn = useRef(false);

  useImperativeHandle(ref, () => ({
    clear() {
      drawn.current = false;
    },
    hasDrawing() {
      return drawn.current;
    },
  }));

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: () => {
      drawn.current = true;
    },
  });

  return (
    <View
      {...pan.panHandlers}
      style={{ flex: 1, backgroundColor: "#fff" }}
    />
  );
});

export default DrawingCanvas;

