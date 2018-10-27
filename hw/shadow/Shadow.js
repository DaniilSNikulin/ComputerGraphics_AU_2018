

function radToDeg(r) {
  return r * 180 / Math.PI;
}
function degToRad(d) {
  return d * Math.PI / 180;
}


world = {
  gui : {
    canvasIsPressed: false,
    xRotation: Math.PI / 20,
    yRotation: 0,
    lastPressX: 0,
    lastPressY: 0,
    scale: 1,
    scaleStep: 0.05,
  },
  look: {
    initPosition: [0, 5, 25],
    target: [0, 0.2, 0],
    up: [0, 1, 0],
    computeViewMatrix: computeCameraViewMatrix,
  },
  projection: {
    fieldOfViewRadians: degToRad(60),
    aspect: 1,
    zNear: 0.01,
    zFar: 100,
    ProjectionMatrix: undefined,
  },
  light: {
    position: [0, 10, -15],
    intensity: [0.8,0.8,0.8],
    offscreen_width: 2048,
    offscreen_height: 2048,
    ProjectionMatrix: undefined,
    ViewMatrix: undefined,
  },
  fRotation: 0,
};



function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  m4 = twgl.m4;
  var canvas = initCanvas('comp_graphics_hw');

  var gl = canvas.getContext("webgl2");
  if (!gl) {
    alert('Your browser does not support WebGL');
    return;
  }
  gl.enable(gl.DEPTH_TEST);

  twgl.resizeCanvasToDisplaySize(gl.canvas);
  world.projection.aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  canvas.width = gl.canvas.width;
  canvas.height = gl.canvas.height;

  world.projection.ProjectionMatrix = m4.perspective(world.projection.fieldOfViewRadians, world.projection.aspect, world.projection.zNear, world.projection.zFar);
  world.light.ProjectionMatrix = m4.ortho(-40, 40, -40, 40, -40.0, 80);
  world.light.ViewMatrix = m4.inverse(m4.lookAt(world.light.position, world.look.target, world.look.target));

  var models = [
    { name: 'bunny', center: [0, 0, -5], scale: 15, needRotate: true, },
    { name: 'plane', center: [0, -1, 0], scale: 30, needRotate: false,},
    { name: 'chair', center: [3, 1,  5], scale: 10, needRotate: true, },
  ];
  for (i = 0; i < models.length; i++) {
    updateModel(gl, models[i]);
  }


  // Link our light and camera shader programs
  const cameraShaderProgramInfo = twgl.createProgramInfo(gl, ["phong-v-shader", "phong-f-shader"]);
  const lightShaderProgramInfo = twgl.createProgramInfo(gl, ["shadow-vs", "shadow-fs"]);
  var cameraShaderProgram = cameraShaderProgramInfo.program;
  var lightShaderProgram = lightShaderProgramInfo.program;

  gl.useProgram(lightShaderProgram);
  var shadowFramebuffer = initFramebufferObject(gl);


  gl.useProgram(cameraShaderProgram)
  var samplerUniform = gl.getUniformLocation(cameraShaderProgram, 'depthColorTexture')

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, shadowFramebuffer.texture)
  gl.uniform1i(samplerUniform, 0)


  // Draw our dragon onto the shadow map
  function drawShadowMap () {
    // We rotate models about the y axis every frame
    world.fRotation += 0.01

    gl.useProgram(lightShaderProgram)

    // Draw to our off screen drawing buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer)

    // Set the viewport to our shadow texture's size
    gl.viewport(0, 0, world.light.offscreen_width, world.light.offscreen_height)
    gl.clearColor(0, 0, 0, 1)
    gl.clearDepth(1.0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)


    for (i  = 0; i < models.length; i++) {
      model = models[i];
      uniforms = computeUniforms(gl, model);
      twgl.setUniforms(lightShaderProgramInfo, {
        MVP: uniforms.LightModelViewProjectionMatrix,
      });
      twgl.setBuffersAndAttributes(gl, lightShaderProgramInfo, model.bufferInfo);
      gl.drawArrays(gl.TRIANGLES, 0, model.geometry.position.count);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }


  // Draw our dragon and floor onto the scene
  function drawModels () {
    gl.useProgram(cameraShaderProgram)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.clearColor(0.98, 0.98, 0.98, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, shadowFramebuffer.texture)
    gl.uniform1i(samplerUniform, 0)

    // Create our camera view matrix
    for (i = 0; i < models.length; i++) {
      model = models[i];
      var cameraUniforms = cameraUniformEject(computeUniforms(gl, model));
      twgl.setUniforms(cameraShaderProgramInfo, cameraUniforms);
      twgl.setBuffersAndAttributes(gl, cameraShaderProgramInfo, model.bufferInfo);
      gl.drawArrays(gl.TRIANGLES, 0, model.geometry.position.count);
    }
  }

  // Draw our shadow map and light map every request animation frame
  function draw () {
    drawShadowMap()
    drawModels()

    window.requestAnimationFrame(draw)
  }
  draw()
}


main();


function computeCameraViewMatrix() {
  var camera = m4.identity()
  var initPosition = world.look.initPosition;
  initPosition = [initPosition[0]*world.gui.scale, initPosition[1]*world.gui.scale, initPosition[2]*world.gui.scale];
  m4.translate(camera, initPosition, camera)
  var xRotMatrix = m4.identity()
  var yRotMatrix = m4.identity()
  m4.rotateX(xRotMatrix, -world.gui.xRotation, xRotMatrix)
  m4.rotateY(yRotMatrix, world.gui.yRotation, yRotMatrix)
  m4.multiply(camera, xRotMatrix, camera)
  m4.multiply(camera, yRotMatrix, camera)
  camera = m4.inverse(m4.lookAt([camera[12], camera[13], camera[14]], world.look.target, world.look.target))
  return camera;
}


function initFramebufferObject(gl) {
  var shadowDepthTexture, depthRenderBuffer;
  var shadowFramebuffer = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer)

  // This section is the meat of things. We create an off screen frame buffer that we'll render
  // our scene onto from our light's viewpoint. We output that to a color texture `shadowDepthTexture`.
  // Then later our camera shader will use `shadowDepthTexture` to determine whether or not fragments
  // are in the shadow.
  shadowDepthTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, shadowDepthTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, world.light.offscreen_width, world.light.offscreen_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  depthRenderBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, world.light.offscreen_width, world.light.offscreen_height);

  gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, shadowDepthTexture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);

  shadowFramebuffer.texture = shadowDepthTexture;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  return shadowFramebuffer;
}


function addOnWheel(elem, handler) {
  if (elem.addEventListener) {
    if ('onwheel' in document) {
      // IE9+, FF17+
      elem.addEventListener("wheel", handler);
    } else if ('onmousewheel' in document) {
      // устаревший вариант события
      elem.addEventListener("mousewheel", handler);
    } else {
      // 3.5 <= Firefox < 17, более старое событие DOMMouseScroll пропустим
      elem.addEventListener("MozMousePixelScroll", handler);
    }
  } else { // IE8-
    text.attachEvent("onmousewheel", handler);
  }
}

function initCanvas(canvasName) {
  var canvas = document.getElementById(canvasName);

  // We set up controls so that we can drag our mouse or finger to adjust the rotation of
  // the camera about the X and Y axes
  canvas.onmousedown = function (e) {
    world.gui.canvasIsPressed = true
    world.gui.lastPressX = e.pageX
    world.gui.lastPressY = e.pageY
  }
  canvas.onmouseup = function () {
    world.gui.canvasIsPressed = false
  }
  canvas.onmouseout = function () {
    world.gui.canvasIsPressed = false
  }
  canvas.onmousemove = function (e) {
    if (world.gui.canvasIsPressed) {
      world.gui.xRotation += (e.pageY - world.gui.lastPressY) / 50
      world.gui.yRotation -= (e.pageX - world.gui.lastPressX) / 50

      world.gui.xRotation = Math.min(world.gui.xRotation, Math.PI / 2.5)
      world.gui.xRotation = Math.max(world.gui.xRotation, 0.1)

      world.gui.lastPressX = e.pageX
      world.gui.lastPressY = e.pageY
    }
  }

  // As you drag your finger we move the camera
  canvas.addEventListener('touchstart', function (e) {
    world.gui.lastPressX = e.touches[0].clientX
    world.gui.lastPressY = e.touches[0].clientY
  });
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault()
    world.gui.xRotation += (e.touches[0].clientY - world.gui.lastPressY) / 50
    world.gui.yRotation -= (e.touches[0].clientX - world.gui.lastPressX) / 50

    world.gui.xRotation = Math.min(world.gui.xRotation, Math.PI / 2.5)
    world.gui.xRotation = Math.max(world.gui.xRotation, 0.1)

    world.gui.lastPressX = e.touches[0].clientX
    world.gui.lastPressY = e.touches[0].clientY
  });

  addOnWheel(canvas, function(e) {
    var delta = e.deltaY || e.detail || e.wheelDelta;
    if (delta > 0) world.gui.scale += world.gui.scaleStep;
    else world.gui.scale -= world.gui.scaleStep;
  });

  return canvas;
}


function cameraUniformEject(uniforms) {
  return {
    ModelViewMatrix: uniforms.ModelViewMatrix,
    MVP: uniforms.ModelViewProjectionMatrix,
    NormalMatrix: uniforms.NormalMatrix,
    lightMVP: uniforms.LightModelViewProjectionMatrix,
    LightPosition: uniforms.LightPosition,
    LightIntensity: uniforms.LightIntensity,
    Kd: uniforms.Kd,
    Ka: uniforms.Ka,
    Ks: uniforms.Ks,
    Shininess: uniforms.Shininess,
    shadowDepthTextureSize: uniforms.shadowDepthTextureSize,
  };
}



function computeUniforms(gl, model) {
  m4 = twgl.m4;

  var projectionMatrix = world.projection.ProjectionMatrix;
  var viewMatrix = world.look.computeViewMatrix();

  var lightProjectionMatrix = world.light.ProjectionMatrix;
  var lightViewMatrix = world.light.ViewMatrix;

  var initModelMatrix = model.initModelMatrix;
  var translationMatrix = m4.translation(model.center);
  var rotationMatrix = model.needRotate ? m4.rotationY(world.fRotation) : m4.identity();
  var modelMatrix = m4.multiply(initModelMatrix, m4.multiply(rotationMatrix, translationMatrix));

  var mvMatrix = m4.multiply(modelMatrix, viewMatrix);
  var mvpMatrix = m4.multiply(mvMatrix, projectionMatrix);
  var normalMatrix = m4.normalMatrix(mvMatrix);

  var lightMV = m4.multiply(modelMatrix, lightViewMatrix);
  var lightMVP = m4.multiply(lightMV, lightProjectionMatrix);

  var shadowDepthTextureSize = (world.light.offscreen_width + world.light.offscreen_height) / 2.0;

  return {
    Kd: model.material.diffuse,
    Ka: model.material.ambient,
    Ks: model.material.specular,
    Shininess: model.material.shininess,

    LightPosition: world.light.position,
    LightIntensity: world.light.intensity,
    LightProjectionMatrix: lightProjectionMatrix,
    LightViewMatrix: lightViewMatrix,
    LightModelViewMatrix: lightMV,
    LightModelViewProjectionMatrix: lightMVP,

    ProjectionMatrix: projectionMatrix,
    ViewMatrix: viewMatrix,
    ModelMatrix: modelMatrix,
    ModelViewMatrix: mvMatrix,
    ModelViewProjectionMatrix: mvpMatrix,
    NormalMatrix: normalMatrix,

    shadowDepthTextureSize: shadowDepthTextureSize,
  };
}


function updateModel(gl, model) {
  m = model;
  m.geometry = obj.getModel(m.name);
  var arrays = {
    VertexPosition: m.geometry.position.array,
    VertexNormal: m.geometry.normal.array,
  }
  m.material = obj.getMaterial(m.name);
  m.bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
  var scaleMatrix = twgl.m4.scaling([m.scale, m.scale, m.scale]);
  m.initModelMatrix = twgl.m4.multiply(scaleMatrix, obj.getInitModelMatrix(model.name));
}
