// WebGL - 2D Geometry Matrix Transform with Projection
// from https://webglfundamentals.org/webgl/webgl-2d-geometry-matrix-transform-with-projection.html

  // "use strict";

world = {
  look: {
    camera: [1.1, 1.15, 0.],
    target: [0, 0.2, 0],
    up: [0, 1, 0],
  },
  projection: {
    zNear: 0.1,
    zFar: 20,
  },
  light: {
    position: [0, 1, 0, 0],
    intensity: [0.8,0.8,0.8],
  },
  fieldOfViewDegree: 60,
  fRotationDegree: 0,
};


function radToDeg(r) {
  return r * 180 / Math.PI;
}
function degToRad(d) {
  return d * Math.PI / 180;
}


function computeUniforms(gl, world, model) {
  m4 = twgl.m4;
  var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  var projectionMatrix = m4.perspective(degToRad(world.fieldOfViewDegree), aspect, world.projection.zNear, world.projection.zFar);
  var viewMatrix = m4.inverse(m4.lookAt(world.look.camera, world.look.target, world.look.up));

  var initModelMatrix = obj.getInitModelMatrix(model.name);
  var translateMatrix = m4.translation(model.center);
  var rotateMatrix = model.needRotate ? m4.rotationY(degToRad(world.fRotationDegree)) : m4.identity();
  var modelMatrix = m4.multiply(m4.multiply(initModelMatrix, rotateMatrix), translateMatrix);

  var mvMatrix = m4.multiply(modelMatrix, viewMatrix);
  var mvpMatrix = m4.multiply(mvMatrix, projectionMatrix);
  var normalMatrix = m4.normalMatrix(mvMatrix);

  return {
    Kd: model.material.diffuse,
    Ka: model.material.ambient,
    Ks: model.material.specular,
    Shininess: model.material.shininess,
    LightPosition: world.light.position,
    LightIntensity: world.light.intensity,
    ModelViewMatrix: mvMatrix,
    NormalMatrix: normalMatrix,
    MVP: mvpMatrix,
  };
}


function computeModel(name, center) {
  var model = obj.getModel(name);
  var attribs = {
    VertexPosition: model.position.array,
    VertexNormal: model.normal.array,
  }
  return {
    name: name,
    model: model,
    center: center,
    attribs: attribs,
  };
}


function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  m4 = twgl.m4;
  var canvas = document.getElementById('comp_graphics_hw');

  var models = [
    { name: 'chair', center: [0, 0,  0.5], needRotate: true, },
    { name: 'bunny', center: [0, 0, -0.5], needRotate: true, },
    { name: 'plane', center: [0, -0.2, 0], needRotate: false,},
  ]


  var gl = canvas.getContext("webgl2");
  if (!gl) {
    alert('Your browser does not support WebGL');
    return;
  }

  // setup GLSL programs
  const phongProgramInfo = twgl.createProgramInfo(gl, ["phong-v-shader", "phong-f-shader"]);
  const phong_program = phongProgramInfo.program;
  var program = phong_program;


  for (i = 0; i < models.length; i++) {
    model = models[i];
    model.geometry = obj.getModel(model.name);
    var attribs = {
      VertexPosition: model.geometry.position.array,
      VertexNormal: model.geometry.normal.array,
    }
    model.material = obj.getMaterial(model.name);
    model.bufferInfo = twgl.createBufferInfoFromArrays(gl, attribs);
    model.vai = twgl.createVertexArrayInfo(gl, phongProgramInfo, model.bufferInfo);
  }



  drawScene();


  // Setup a ui.
  webglLessonsUI.setupSlider("#fRotation", {value: world.fRotationDegree,
   slide: updateRotation, min: -360, max: 360});

  function updateRotation(event, ui) {
    world.fRotationDegree = ui.value;
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

    gl.useProgram(program);

    for (i = 0; i < models.length; i++) {
      model = models[i];
      gl.bindVertexArray(model.vai.vertexArrayObject);
      var uniforms = computeUniforms(gl, world, model);
      twgl.setUniforms(phongProgramInfo, uniforms);

      var primitiveType = gl.TRIANGLES;
      var offset = 0;
      var count = model.geometry.position.count;
      gl.drawArrays(primitiveType, offset, count);
    }

    //~ twgl.setBuffersAndAttributes(gl, phongProgramInfo, bufferInfo);


    // Draw the geometry.
    //~ var primitiveType = gl.TRIANGLES;
    //~ var offset = 0;
    //~ var count = model.geometry.position.count;
    //~ gl.drawArrays(primitiveType, offset, count);
  }
}



main();
