// HelloQuad.js (c) 2012 matsuda


var downCoord = [-1, -1];
var upCoord = [1, 1];
var offset = [0.0, 0.0];
var scale = [1, 1];

var dragging = false;
var lastX = 0, lastY = 0;


function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');
  var VSHADER_SOURCE = document.getElementById("v-shader").text;
  var FSHADER_SOURCE = document.getElementById("f-shader").text;

  var gl = getWebGLContext(canvas);
  if (!gl) {
    alert('Your browser does not support WebGL');
    return;
  }

  canvas.height = gl.canvas.clientHeight;
  canvas.width = gl.canvas.clientWidth;
  gl.viewport(0,0, gl.canvas.width,gl.canvas.height);

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    alert('Failed to intialize shaders.');
    return;
  }

  // Write the positions of vertices to a vertex shader
  var n = init(gl, canvas);
  if (n < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
}



function init(gl, canvas) {
  var vertices = new Float32Array([-1,1,   -1,-1,   1,1,　1,-1]);
  var n = 4; // The number of vertices

  // Create a buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }

  var u_offset = gl.getUniformLocation(gl.program, 'offset');
  var u_scale = gl.getUniformLocation(gl.program, 'scale');

  canvas.onmousedown = function(ev) {
    if (ev.button == 0) {
      dragging = true;
    } else if (ev.button == 2) {
      downCoord = transform(ev, canvas);
    }
  };
  canvas.onmouseup = function(ev) {
    if (ev.button == 0) {
      dragging = false;
    } else if (ev.button == 2) {
      upCoord = transform(ev, canvas);
      pushBox();
      pushCoord(gl, u_offset, u_scale);
    }
  };
  canvas.onmousemove = function(ev) {
    var point = transform(ev, canvas);
    var x = point[0], y = point[1];
    if (dragging) {
      moment = 0.8;
      dx = (x - lastX) * moment;
      dy = (y - lastY) * moment;
      downCoord[0] = downCoord[0] - dx;
      downCoord[1] = downCoord[1] - dy;
      upCoord[0] = upCoord[0] - dx;
      upCoord[1] = upCoord[1] - dy;
      pushBox();
      pushCoord(gl, u_offset, u_scale);
    }
    lastX = x, lastY = y;
  };
  canvas.ondblclick = function(ev) {
    downCoord = [-1, -1];
    upCoord = [1, 1];
    offset = [0.0, 0.0];
    scale = [1, 1];
    dragging = false;
    lastX = 0, lastY = 0;
    pushBox();
    pushCoord(gl, u_offset, u_scale);
  }

  gl.uniform2f(u_offset, 0, 0);
  gl.uniform2f(u_scale, 1, 1);

  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  return n;
}

function transform(ev, canvas) {
  var x = ev.clientX; // координата X указателя мыши
  var y = ev.clientY; // координата Y указателя мыши
  var rect = ev.target.getBoundingClientRect();
  x = ((x - rect.left) - canvas. width/2)/(canvas.width/2) * scale[0] + offset[0];
  y = (canvas. height/2 - (y - rect.top))/(canvas.height/2) *scale[1] + offset[1];
  return [x, y];
}


function pushBox() {
  var minX = Math.min(downCoord[0], upCoord[0]);
  var maxX = Math.max(downCoord[0], upCoord[0]);
  var minY = Math.min(downCoord[1], upCoord[1]);
  var maxY = Math.max(downCoord[1], upCoord[1]);

  offset = [(maxX + minX)/2, (maxY + minY)/2];
  scale = [(maxX - minX)/2, (maxY - minY)/2];
  // console.log('push', offset, scale);
}


function pushCoord(gl, u_offset, u_scale) {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(u_offset, offset[0], offset[1]);
  gl.uniform2f(u_scale, scale[0], scale[1]);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
