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
  'precision mediump float;\n' +
  'varying vec4 fragment_position;\n' +

  'vec3 mandelbrot(vec2 c);\n' +
  'float modulus(vec2 v);\n' +
  'vec2 complex_product(vec2 a, vec2 b);\n' +
  'vec3 jet(float t);\n' +

  'vec3 mandelbrot(vec2 c) {\n' +
  '  c.x = c.x - 0.5;\n' +
  '  const int max_iteration = 5000;\n' +
  '  vec2 z = c;\n' +
  '  for (int i = 0; i < max_iteration; ++i) {\n' +
  '    z = complex_product(z, z) + c;\n' +
  '    if (modulus(z) >= 4.0) {\n' +
  '      float dist_from_set = float(i) / float(max_iteration) * 2.0 - 0.05;\n' +
  '      return jet(dist_from_set);\n' +
  '    }\n' + 
  '  }\n' +
  '  return vec3(0);\n' +
  '}\n' +

  'vec3 jet(float t){\n' +
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
  '  vec3 c = mandelbrot(point);\n' +
  '  gl_FragColor = vec4(c.x, c.y, c.z, 1.0);\n' +
  '}\n';




function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

// Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  // var gl = canvas.getContext('webgl')
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
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0, 0, 0, 1);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw the rectangle
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
}



function initVertexBuffers(gl) {
  var vertices = new Float32Array([
    -1,1,   -1,-1,   1,1,　1,-1
  ]);
  var n = 4; // The number of vertices

  // Create a buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  return n;
}
