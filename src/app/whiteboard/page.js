'use client'

import { useEffect, useRef } from 'react';
import { Canvas, Rect, Point, util} from 'fabric/es';

const Direction = {
  LEFT: 0,
  UP: 1,
  RIGHT: 2,
  DOWN: 3
};

let zoomLevel = 0;
const zoomLevelMin = 0;
const zoomLevelMax = 3;

let shiftKeyDown = false;
let mouseDownPoint = null;

const CanvasComponent = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = new Canvas(canvasRef.current, {
      width: 700,
      height: 700,
      selectionKey: 'ctrlKey'
    });

    canvas.add(new Rect({
      left: 100,  
      top: 100,
      width: 50,
      height: 50,
      fill: '#faa'
    }));
    canvas.add(new Rect({
      left: 300,
      top: 300,
      width: 50,
      height: 50,
      fill: '#afa'
    }));

    canvas.on('mouse:down', function(options) {
      var pointer = canvas.getPointer(options.e, true);
      mouseDownPoint = new Point(pointer.x, pointer.y);
    });
    canvas.on('mouse:up', function(options) {
      mouseDownPoint = null;
    });
    canvas.on('mouse:move', function(options) {
      if (shiftKeyDown && mouseDownPoint) {
        var pointer = canvas.getPointer(options.e, true);
        var mouseMovePoint = new Point(pointer.x, pointer.y);
        canvas.relativePan(mouseMovePoint.subtract(mouseDownPoint));
        mouseDownPoint = mouseMovePoint;
        keepPositionInBounds(canvas);
      }
    });

    const handleKeyDown = function(options) {
      if (options.repeat) {
        return;
      }
      var key = options.which || options.keyCode; // key detection
      if (key == 16) { // handle Shift key
        canvas.defaultCursor = 'move';
        canvas.selection = false;
        shiftKeyDown = true;
      }
    };

    const handleKeyUp = function(options) {
      var key = options.which || options.keyCode; // key detection
      if (key == 16) { // handle Shift key
        canvas.defaultCursor = 'default';
        canvas.selection = true;
        shiftKeyDown = false;
      }
    };

    const handleMouseWheel = function(event) {
      event.preventDefault();
      var delta = event.deltaY;
      if (delta != 0) {
        var pointer = canvas.getPointer(event, true);
        var point = new Point(pointer.x, pointer.y);
        if (delta > 0) {
          zoomOut(point);
        } else if (delta < 0) {
          zoomIn(point);
        }
      }
    };

    document.body.addEventListener('keydown', handleKeyDown);
    document.body.addEventListener('keyup', handleKeyUp);
    document.querySelector('.canvas-container').addEventListener('wheel', handleMouseWheel);

    function zoomIn(point) {
      if (zoomLevel < zoomLevelMax) {
        zoomLevel++;
        canvas.zoomToPoint(point, Math.pow(2, zoomLevel));
        keepPositionInBounds(canvas);
      }
    }

    function zoomOut(point) {
      if (zoomLevel > zoomLevelMin) {
        zoomLevel--;
        canvas.zoomToPoint(point, Math.pow(2, zoomLevel));
        keepPositionInBounds(canvas);
      }
    }

    function keepPositionInBounds() {
      var zoom = canvas.getZoom();
      var xMin = (2 - zoom) * canvas.getWidth() / 2;
      var xMax = zoom * canvas.getWidth() / 2;
      var yMin = (2 - zoom) * canvas.getHeight() / 2;
      var yMax = zoom * canvas.getHeight() / 2;

      var point = new Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
      var center = util.transformPoint(point, canvas.viewportTransform);

      var clampedCenterX = clamp(center.x, xMin, xMax);
      var clampedCenterY = clamp(center.y, yMin, yMax);

      var diffX = clampedCenterX - center.x;
      var diffY = clampedCenterY - center.y;

      if (diffX != 0 || diffY != 0) {
        canvas.relativePan(new Point(diffX, diffY));
      }
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(value, max));
    }

    return () => {
      document.body.removeEventListener('keydown', handleKeyDown);
      document.body.removeEventListener('keyup', handleKeyUp);
      canvasRef.current.removeEventListener('wheel', handleMouseWheel);
    };
  }, []);

  return( 
    <div className='flex justify-center'>
      <canvas ref={canvasRef} className='border-2 border-black'/>
    </div>
  );
};

export default CanvasComponent;
