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

  var worldViewProjectionLocation = gl.getUniformLocation(program, "u_worldViewProjection");
  var worldInverseTransposeLocation = gl.getUniformLocation(program, "u_worldInverseTranspose");
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


  // First let's make some variables
  // to hold the translation,
  var fieldOfViewRadians = degToRad(60);
  var fRotationRadians = 0;

  drawScene();

  function radToDeg(r) {
    return r * 180 / Math.PI;
  }

  function degToRad(d) {
    return d * Math.PI / 180;
  }

  // Setup a ui.
  webglLessonsUI.setupSlider("#fRotation", {value: radToDeg(fRotationRadians),
   slide: updateRotation, min: -360, max: 360});

  function updateRotation(event, ui) {
    fRotationRadians = degToRad(ui.value);
    drawScene();
  }


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

    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var zNear = 0.1;
    var zFar = 20;
    var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    // Compute the camera's matrix
    var camera = [0.2, 0.25, .5];
    var target = [0, 0.1, 0];
    var up = [0, 1, 0];
    var cameraMatrix = m4.lookAt(camera, target, up);

    // Make a view matrix from the camera matrix.
    var viewMatrix = m4.inverse(cameraMatrix);
    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    var worldMatrix = m4.yRotation(fRotationRadians);
    var worldViewProjectionMatrix = m4.multiply(viewProjectionMatrix, worldMatrix);
    var worldInverseMatrix = m4.inverse(worldMatrix);
    var worldInverseTransposeMatrix = m4.transpose(worldInverseMatrix);

    // Set the matrices
    gl.uniformMatrix4fv(
        worldViewProjectionLocation, false,
        worldViewProjectionMatrix);
    gl.uniformMatrix4fv(
        worldInverseTransposeLocation, false,
        worldInverseTransposeMatrix);

    // Set the color to use
    gl.uniform4fv(colorLocation, [0.7, 0.9, 0.2, 1]); // green

    // set the light direction.
    gl.uniform3fv(reverseLightDirectionLocation, m4.normalize([-0.5, 1.7, 1]));

    // Draw the geometry.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = bunnyGeometry.position.count;
    gl.drawArrays(primitiveType, offset, count);
  }
}



main();
