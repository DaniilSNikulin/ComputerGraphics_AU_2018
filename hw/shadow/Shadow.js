// WebGL - 2D Geometry Matrix Transform with Projection
// from https://webglfundamentals.org/webgl/webgl-2d-geometry-matrix-transform-with-projection.html

  // "use strict";

function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  m4 = twgl.m4;
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
  const phongProgramInfo = twgl.createProgramInfo(gl, ["phong-v-shader", "phong-f-shader"]);
  const phong_program = phongProgramInfo.program;
  var program = phong_program;

  const arrays = {
    VertexPosition: bunnyGeometry.position.array,
    VertexNormal: bunnyGeometry.normal.array,
  };
  const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

  var uniforms = {
    Kd: [0.5, 0.8, 0.5],
    Ka: [0.1, 0.1, 0.1],
    Ks: [0.9, 0.3, 0.9],
    Shininess: 180.0,
    LightPosition: [0, 1, 0, 0],
    LightIntensity: [0.8,0.8,0.8],
  };

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
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas AND the depth buffer.
    gl.clearColor(1, 1, 1, 1);   // clear to white
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);


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

    var modelMatrix = m4.rotationY(fRotationRadians);
    var mvMatrix = m4.multiply(modelMatrix, viewMatrix);
    var mvpMatrix = m4.multiply(mvMatrix, projectionMatrix);
    var normalMatrix = m4.normalMatrix(mvMatrix);

    uniforms.ModelViewMatrix = mvMatrix;
    uniforms.NormalMatrix = normalMatrix;
    uniforms.MVP = mvpMatrix;

    gl.useProgram(program);
    twgl.setBuffersAndAttributes(gl, phongProgramInfo, bufferInfo);
    twgl.setUniforms(phongProgramInfo, uniforms);

    // Draw the geometry.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = bunnyGeometry.position.count;
    gl.drawArrays(primitiveType, offset, count);
  }
}



main();
