// WebGL - 2D Geometry Matrix Transform with Projection
// from https://webglfundamentals.org/webgl/webgl-2d-geometry-matrix-transform-with-projection.html

  // "use strict";

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


  // setup GLSL programs
  var phong_program = webglUtils.createProgramFromScripts(gl, ["phong-v-shader", "phong-f-shader"]);

  var positionLocationPhong = gl.getAttribLocation(phong_program, "VertexPosition");
  var normalLocationPhong = gl.getAttribLocation(phong_program, "VertexNormal");

  var MVPLocationPhong = gl.getUniformLocation(phong_program, "MVP");
  var normalMatrixLocationPhong = gl.getUniformLocation(phong_program, "NormalMatrix");
  var MVLocationPhong = gl.getUniformLocation(phong_program, "ModelViewMatrix");

  var lightPositionLocationPhong = gl.getUniformLocation(phong_program, "LightPosition");
  var lightIntensityLocationPhong = gl.getUniformLocation(phong_program, "LightIntensity");

  var kdLocationPhong = gl.getUniformLocation(phong_program, "Kd");
  var kaLocationPhong = gl.getUniformLocation(phong_program, "Ka");
  var ksLocationPhong = gl.getUniformLocation(phong_program, "Ks");
  var shininessLocationPhong = gl.getUniformLocation(phong_program, "Shininess");


  var vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(positionLocationPhong);

  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, bunnyGeometry.position.array, gl.STATIC_DRAW);

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = bunnyGeometry.position.itemSize;
  gl.vertexAttribPointer(positionLocationPhong, size, gl.FLOAT, false, 0, 0);

  // Turn on the attribute
  gl.enableVertexAttribArray(normalLocationPhong);

  var normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, bunnyGeometry.normal.array, gl.STATIC_DRAW);

  var size = bunnyGeometry.normal.itemSize;
  gl.vertexAttribPointer(normalLocationPhong, size, gl.FLOAT, false, 0, 0);


  // First let's make some variables
  // to hold the translation,
  var fieldOfViewRadians = degToRad(60);
  var fRotationRadians = 0;

  program = phong_program;
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

    gl.uniform3fv(kdLocationPhong, [0.5, 0.8, 0.5]);
    gl.uniform3fv(ksLocationPhong, [0.9, 0.3, 0.9]);
    gl.uniform3fv(kaLocationPhong, [0.1, 0.1, 0.1]);
    gl.uniform1f( shininessLocationPhong, 180.0);
    gl.uniform4fv(lightPositionLocationPhong, [0, 1, 0, 0] );
    gl.uniform3fv(lightIntensityLocationPhong, [0.8,0.8,0.8] );


    // Compute the camera's matrix
    var camera = [0.2, 0.25, .5];
    var target = [0, 0.1, 0];
    var up = [0, 1, 0];
    var cameraMatrix = m4.lookAt(camera, target, up);
    var viewMatrix = m4.inverse(cameraMatrix);

    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var zNear = 0.1;
    var zFar = 20;
    var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    var modelMatrix = m4.yRotation(fRotationRadians);
    var mvMatrix = m4.multiply(viewMatrix, modelMatrix);
    var mvpMatrix = m4.multiply(projectionMatrix, mvMatrix);
    var normalMatrix = m4.normalMatrix(mvMatrix);

    // Set the matrices
    gl.uniformMatrix4fv(MVLocationPhong, false, mvMatrix);
    gl.uniformMatrix3fv(normalMatrixLocationPhong, false, normalMatrix);
    gl.uniformMatrix4fv(MVPLocationPhong, false, mvpMatrix);


    // Draw the geometry.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = bunnyGeometry.position.count;
    gl.drawArrays(primitiveType, offset, count);
  }
}



main();
