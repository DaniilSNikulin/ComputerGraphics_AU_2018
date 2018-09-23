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
  var canvas = document.getElementById('webgl');
  var vert_fractal_shader = document.getElementById("fractal-v-shader").text;
  var fragm_fractal_shader = document.getElementById("fractal-f-shader").text;
  var vert_texture_shader = document.getElementById("texture-v-shader").text;
  var fragm_texture_shader = document.getElementById("texture-f-shader").text;

  var gl = canvas.getContext("webgl");
  if (!gl) {
    alert('Your browser does not support WebGL');
    return;
  }

  // setup GLSL program
  var program = webglUtils.createProgramFromScripts(gl, ["texture-v-shader", "texture-f-shader"]);
  var fractalProgram = webglUtils.createProgramFromScripts(gl, ["fractal-v-shader", "fractal-f-shader"]);

  // look up where the vertex data needs to go and uniforms
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var texcoordLocation = gl.getAttribLocation(program, "a_texcoord");
  var matrixLocation = gl.getUniformLocation(program, "u_matrix");
  var textureLocation = gl.getUniformLocation(program, "u_texture");

  // lookup fractal shaders vertex data and uniforms
  var a_position = gl.getAttribLocation(fractalProgram, "a_position");
  var u_offset = gl.getUniformLocation(fractalProgram, 'offset');
  var u_scale = gl.getUniformLocation(fractalProgram, 'scale');
  var u_max_iter = gl.getUniformLocation(fractalProgram, 'u_max');

  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  setGeometry(gl, 3);
  var fractalPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, fractalPositionBuffer);
  setGeometry(gl, 1);

  // provide texture coordinates for the rectangle.
  var texcoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  setTexcoords(gl);

  // Create a texture to render to
  const targetTextureWidth =  3*gl.canvas.clientWidth;
  const targetTextureHeight = 3*gl.canvas.clientHeight;
  const targetTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, targetTexture);
  {
    // define size and format of level 0
    const level = 0;
    const internalFormat = gl.RGBA;
    const border = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const data = null;
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  targetTextureWidth, targetTextureHeight, border,
                  format, type, data);

    // set the filtering so we don't need mips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  // Create and bind the framebuffer
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

  // attach the texture as the first color attachment
  const level = 0;
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, level);

  var translation = [0, 0];
  var scale = 1;
  var maxIter = 200;
  var dragging = false;

  drawScene();

  // Setup a ui.
  webglLessonsUI.setupSlider("#maxIter", {value: maxIter, slide: updateMaxIter, min: 50, max: 1000 });
  function updateMaxIter(event, ui) {
    maxIter = ui.value;
    needRecompute = true;
    drawScene();
  }
  canvas.onmousedown = function(ev) {
    if (ev.button == 0) {
      downCoord = transform(ev, canvas);
      moveTransStart = [translation[0], translation[1]];
      dragging = true;
    }
  };
  canvas.onmouseup = function(ev) {
    if (ev.button == 0) {
      dragging = false;
    }
  };
  canvas.onmousemove = function(ev) {
    if (dragging) {
      var point = transform(ev, canvas);
      var x = point[0], y = point[1];
      var dx = (x - downCoord[0]) / global_scale;
      var dy = (y - downCoord[1]) / global_scale;
      translation[0] = moveTransStart[0] + dx;
      translation[1] = moveTransStart[1] + dy;
      if (Math.abs(translation[0]) > 2 || Math.abs(translation[1]) > 2) {
        needRecompute = true;
      }
    }
    var endDate   = new Date();
    var seconds = (endDate.getTime() - lastRecomputeDate.getTime()) / 1000;
    if (!seconds || seconds > 3) {
      needRecompute = true;
    }
    drawScene();
  };
  addOnWheel(canvas, function(e) {
    var delta = e.deltaY || e.detail || e.wheelDelta;
    if (delta > 0) scale *= 0.95;
    else scale *= 1.05;
    var endDate   = new Date();
    var seconds = (endDate.getTime() - lastRecomputeDate.getTime()) / 1000;
    if (!seconds || seconds > 2 || scale > 3 || scale < 0.33) {
      needRecompute = true;
    }
    drawScene();
  });

  function drawFractal() {
    gl.useProgram(fractalProgram);
    gl.enableVertexAttribArray(a_position);
    gl.bindBuffer(gl.ARRAY_BUFFER, fractalPositionBuffer);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    gl.vertexAttribPointer(a_position, size, gl.FLOAT, false, 0, 0);
    gl.uniform2f(u_offset, global_offset[0], global_offset[1]);
    gl.uniform2f(u_scale, 3*global_scale, 3*global_scale);
    gl.uniform1i(u_max_iter, maxIter);

    // Draw the geometry.
    var count = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, count);
  }

  function drawQuad() {
    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Turn on the attribute
    gl.enableVertexAttribArray(positionLocation);

    // Bind the position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    gl.vertexAttribPointer(positionLocation, size, gl.FLOAT, false, 0, 0);

    // Turn on the teccord attribute
    gl.enableVertexAttribArray(texcoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    gl.vertexAttribPointer(texcoordLocation, size, gl.FLOAT, false, 0, 0);

    // Compute the matrices
    var projectionMatrix = m3.identity();
    var translationMatrix = m3.translation(translation[0], translation[1]);
    var rotationMatrix = m3.identity();
    var scaleMatrix = m3.scaling(scale, scale);

    // Multiply the matrices.
    var matrix = m3.multiply(projectionMatrix, translationMatrix);
    matrix = m3.multiply(matrix, rotationMatrix);
    matrix = m3.multiply(matrix, scaleMatrix);

    // Set the matrix.
    gl.uniformMatrix3fv(matrixLocation, false, matrix);
    // Tell the shader to use texture unit 0 for u_texture
    gl.uniform1i(textureLocation, 0);

    // Draw the geometry.
    var count = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, count);
  }

  // Draw the scene.
  function drawScene() {
    canvas.height = gl.canvas.clientHeight;
    canvas.width = gl.canvas.clientWidth;

    if (needRecompute || counter < 2) {
      counter += 1;
      global_offset[0] -= translation[0] * global_scale;
      global_offset[1] -= translation[1] * global_scale;
      translation = [0, 0];
      global_scale /= 0.8*scale + 1*0.2;
      scale = 1;
      // render to our targetTexture by binding the framebuffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

      // Tell WebGL how to convert from clip space to pixels
      gl.viewport(0, 0, targetTextureWidth, targetTextureHeight);

      // Clear the canvas AND the depth buffer.
      gl.clearColor(0, 0, 1, 1);   // clear to blue
      gl.clear(gl.COLOR_BUFFER_BIT);

      drawFractal();
      needRecompute = false;
      lastRecomputeDate = new Date();
    }

    {
      // render to the canvas
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      // render the cube with the texture we just rendered to
      gl.bindTexture(gl.TEXTURE_2D, targetTexture);

      // Tell WebGL how to convert from clip space to pixels
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      // Clear the canvas AND the depth buffer.
      gl.clearColor(1, 1, 1, 1);   // clear to white
      gl.clear(gl.COLOR_BUFFER_BIT);

      drawQuad();
    }
  }
}


// Fill the buffer with the values that define a letter 'F'.
function setGeometry(gl, scale) {
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -scale,  scale,
        -scale, -scale,
         scale,  scale,
         scale, -scale
      ]),
      gl.STATIC_DRAW);
}


// Fill the buffer with texture coordinates the cube.
function setTexcoords(gl) {
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
          0, 1,
          0, 0,
          1, 1,
          1, 0,
      ]),
      gl.STATIC_DRAW);
}


function transform(ev, canvas) {
  var x = ev.clientX; // координата X указателя мыши
  var y = ev.clientY; // координата Y указателя мыши
  var rect = ev.target.getBoundingClientRect();
  x = ((x - rect.left) - canvas. width/2)/(canvas.width/2) * global_scale + global_offset[0];
  y = (canvas. height/2 - (y - rect.top))/(canvas.height/2) *global_scale + global_offset[1];
  return [x, y];
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

main();
