// WebGL - 2D Geometry Matrix Transform with Projection
// from https://webglfundamentals.org/webgl/webgl-2d-geometry-matrix-transform-with-projection.html

  // "use strict";

var downCoord = [-1, -1];
var moveTransStart = null;
var global_offset = [0.0, 0.0];
var global_scale = 1;
var needRecompute = true;
var lastRecomputeDate = null;

// костыль для моего браузера (тот же код на codePen работает и без него)
var counter = 0;

function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.getElementById('comp_graphics_hw');


  var scene = new THREE.Scene();
  var bunnyText = document.getElementById("bunny-obj").text;
  var bunnyObject = new THREE.OBJLoader().parse(bunnyText)
  var bunnyGeometry = bunnyObject.children[0].geometry.attributes

  var gl = canvas.getContext("webgl2");
  if (!gl) {
    alert('Your browser does not support WebGL');
    return;
  }


  // setup GLSL program
  var phong_program = webglUtils.createProgramFromScripts(gl, ["phong-v-shader", "phong-f-shader"]);
  var program = webglUtils.createProgramFromScripts(gl, ["simple-v-shader", "simple-f-shader"]);

  // look up where the vertex data needs to go and uniforms
  var positionAttributeLocationSimple = gl.getAttribLocation(program, "a_position");
  var normalAttributeLocationSimple = gl.getAttribLocation(program, "a_normal");

  var matrixLocation = gl.getUniformLocation(program, "u_matrix");
  var colorLocation = gl.getUniformLocation(program, "u_color");
  var reverseLightDirectionLocation = gl.getUniformLocation(program, "u_reverseLightDirection");

  var vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(positionAttributeLocationSimple);

  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, bunnyGeometry.position.array, gl.STATIC_DRAW);

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = bunnyGeometry.position.itemSize;
  gl.vertexAttribPointer(positionAttributeLocationSimple, size, gl.FLOAT, false, 0, 0);

  // Turn on the attribute
  gl.enableVertexAttribArray(normalAttributeLocationSimple);

  var normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, bunnyGeometry.normal.array, gl.STATIC_DRAW);

  var size = bunnyGeometry.normal.itemSize;
  gl.vertexAttribPointer(normalAttributeLocationSimple, size, gl.FLOAT, false, 0, 0);


  drawScene();


  // Draw the scene.
  function drawScene() {
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas AND the depth buffer.
    gl.clearColor(1, 1, 1, 1);   // clear to white
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.useProgram(program);

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    scale = 3
    // Compute the matrices
    var projectionMatrix = m4.identity();
    var translationMatrix = m4.translation(0, 0, 0);
    var rotationMatrix = m4.identity();
    var scaleMatrix = m4.scaling(scale, scale, scale);

    // Multiply the matrices.
    var matrix = m4.multiply(projectionMatrix, translationMatrix);
    matrix = m4.multiply(matrix, rotationMatrix);
    matrix = m4.multiply(matrix, scaleMatrix);

    // Set the matrix.
    gl.uniformMatrix4fv(matrixLocation, false, matrix);

    // Set the color to use
    gl.uniform4fv(colorLocation, [0.7, 0.9, 0.2, 1]); // green

    // set the light direction.
    gl.uniform3fv(reverseLightDirectionLocation, m4.normalize([0.5, 0.7, 1]));

    // Draw the geometry.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = bunnyGeometry.position.count;
    gl.drawArrays(primitiveType, offset, count);
  }
}



main();
