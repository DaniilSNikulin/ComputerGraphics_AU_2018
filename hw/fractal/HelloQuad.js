// HelloQuad.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'varying vec4 fragment_position;\n' +
  'void main() {\n' +
  '  gl_Position = fragment_position = a_Position;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'precision highp float;\n' +
  'uniform vec2 offset;\n' +
  'uniform vec2 scale;\n' +
  'varying vec4 fragment_position;\n' +

  'vec2 transform(vec2 point);\n' +
  'vec3 mandelbrot(vec2 c);\n' +
  'float modulus(vec2 v);\n' +
  'vec2 complex_product(vec2 a, vec2 b);\n' +
  'vec3 jet(float t);\n' +

  'vec2 transform(vec2 point) {\n' +
  '  return point * scale + offset;\n' +
  '}\n' +

  'vec3 mandelbrot(vec2 c) {\n' +
  '  c.x = c.x - 0.5;\n' +
  '  const int max_iteration = 15000;\n' +
  '  vec2 z = c;\n' +
  '  for (int i = 0; i < max_iteration; ++i) {\n' +
  '    z = complex_product(z, z) + c;\n' +
  '    if (modulus(z) >= 4.0) {\n' +
  '      float dist_from_set = float(i) / float(max_iteration);\n' +
  '      return jet(dist_from_set);\n' +
  '    }\n' + 
  '  }\n' +
  '  return vec3(0);\n' +
  '}\n' +

  'vec3 jet(float t){\n' +
  '  t = t * 2.0 - 0.05;\n' +
  '  return clamp(vec3(1.5) - abs(4.0*vec3(t) + vec3(-3,-2,-1)), vec3(0), vec3(1));\n' +
  '}\n' +
  'float modulus(vec2 v) {\n' +
  '  vec2 w = v*v;\n' +
  '  return w.x + w.y;\n' +
  '}\n' +
  'vec2 complex_product(vec2 a, vec2 b) {\n' +
  '  return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);\n' +
  '}\n' +

  'void main() {\n' +
  '  vec2 point = fragment_position.xy;\n' +
  '  vec3 c = mandelbrot(transform(point));\n' +
  '  gl_FragColor = vec4(c.x, c.y, c.z, 1.0);\n' +
  '}\n';


var downCoord = [-1, -1];
var upCoord = [1, 1];
var offset = [0.0, 0.0];
var scale = [1, 1];


function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

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

  // Clear <canvas>
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

  canvas.onmousedown = function(ev) { down(transform(ev, canvas)); };
  canvas.onmouseup = function(ev) { 
    up(transform(ev, canvas));
    pushBox();
    pushCoord(gl, u_offset, u_scale);
  };

  gl.uniform2f(u_offset, 0, 0);
  gl.uniform2f(u_scale, 1, 1);

  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  return n;
}

function transform(ev, canvas) {
  console.log(ev.button);
  var x = ev.clientX; // координата X указателя мыши
  var y = ev.clientY; // координата Y указателя мыши
  var rect = ev.target.getBoundingClientRect();
  x = ((x - rect.left) - canvas. width/2)/(canvas.width/2) * scale[0] + offset[0];
  y = (canvas. height/2 - (y - rect.top))/(canvas.height/2) *scale[1] + offset[1];
  return [x, y];
}

function down(coord) {
  downCoord = coord;
}

function up(coord) {
  upCoord = coord;
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
