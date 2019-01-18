var recorder = (function (exports) {
  'use strict';

  /*
   * Adapted to ES6 from:
   * https://github.com/spite/ccapture.js/blob/master/src/tar.js
   *
   * Added length tracking
   * Tarball.prototype.append takes any ArrayBuffer instead of Uint8Array
   */

  let utils = {
    
    lookup: [
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
      'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
      'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
      'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
      'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
      'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
      'w', 'x', 'y', 'z', '0', '1', '2', '3',
      '4', '5', '6', '7', '8', '9', '+', '/'
    ],
    
    clean(length) {
      var i, buffer = new Uint8Array(length);
      for (i = 0; i < length; i += 1) {
        buffer[i] = 0;
      }
      return buffer;
    },
    
    extend(orig, length, addLength, multipleOf) {
      var newSize = length + addLength,
        buffer = utils.clean((parseInt(newSize / multipleOf) + 1) * multipleOf);

      buffer.set(orig);

      return buffer;
    },

    pad(num, bytes, base) {
      num = num.toString(base || 8);
      return "000000000000".substr(num.length + 12 - bytes) + num;
    },

    stringToUint8(input, out, offset) {
      var i, length;

      out = out || utils.clean(input.length);

      offset = offset || 0;
      for (i = 0, length = input.length; i < length; i += 1) {
        out[offset] = input.charCodeAt(i);
        offset += 1;
      }

      return out;
    },

    uint8ToBase64(uint8) {
      var i,
        extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
        output = "",
        temp, length;

      function tripletToBase64 (num) {
        return utils.lookup[num >> 18 & 0x3F] + utils.lookup[num >> 12 & 0x3F] + utils.lookup[num >> 6 & 0x3F] + utils.lookup[num & 0x3F];
      }

      // go through the array every three bytes, we'll deal with trailing stuff later
      for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
        temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
        output += tripletToBase64(temp);
      }

      // this prevents an ERR_INVALID_URL in Chrome (Firefox okay)
      switch (output.length % 4) {
      case 1:
        output += '=';
        break;
      case 2:
        output += '==';
        break;
      default:
        break;
      }

      return output;
    }

  };



  let header = {
    
    structure: [
      {
        'field': 'fileName',
        'length': 100
      },
      {
        'field': 'fileMode',
        'length': 8
      },
      {
        'field': 'uid',
        'length': 8
      },
      {
        'field': 'gid',
        'length': 8
      },
      {
        'field': 'fileSize',
        'length': 12
      },
      {
        'field': 'mtime',
        'length': 12
      },
      {
        'field': 'checksum',
        'length': 8
      },
      {
        'field': 'type',
        'length': 1
      },
      {
        'field': 'linkName',
        'length': 100
      },
      {
        'field': 'ustar',
        'length': 8
      },
      {
        'field': 'owner',
        'length': 32
      },
      {
        'field': 'group',
        'length': 32
      },
      {
        'field': 'majorNumber',
        'length': 8
      },
      {
        'field': 'minorNumber',
        'length': 8
      },
      {
        'field': 'filenamePrefix',
        'length': 155
      },
      {
        'field': 'padding',
        'length': 12
      }
    ],
    
    format(data, cb) {
      var buffer = utils.clean(512),
        offset = 0;

      header.structure.forEach(function (value) {
        var str = data[value.field] || "",
          i, length;

        for (i = 0, length = str.length; i < length; i += 1) {
          buffer[offset] = str.charCodeAt(i);
          offset += 1;
        }

        offset += value.length - i; // space it out with nulls
      });

      if (typeof cb === 'function') {
        return cb(buffer, offset);
      }
      return buffer;
    }
    
  };


  const recordSize = 512;

  class Tarball {
    
    constructor(recordsPerBlock = 20) {
      this.written = 0;
      this.blockSize = recordsPerBlock * recordSize;
      this.out = utils.clean(this.blockSize);
      this.blocks = [];
      this.length = 0;
    }
    
    clear() {
      this.written = 0;
      this.out = utils.clean(this.blockSize);
    }
    
    append(filepath, input, opts = {}) {
      var data,
        checksum,
        mode,
        mtime,
        uid,
        gid,
        headerArr;

      if (typeof input === 'string') {
        input = utils.stringToUint8(input);
      } else if (input instanceof ArrayBuffer) {
        input = new Uint8Array(input);
      } else {
        throw 'Invalid input type. You gave me: ' + input.constructor.toString().match(/function\s*([$A-Za-z_][0-9A-Za-z_]*)\s*\(/)[1];
      }

      mode = opts.mode || parseInt('777', 8) & 0xfff;
      mtime = opts.mtime || Math.floor(+new Date() / 1000);
      uid = opts.uid || 0;
      gid = opts.gid || 0;

      data = {
        fileName: filepath,
        fileMode: utils.pad(mode, 7),
        uid: utils.pad(uid, 7),
        gid: utils.pad(gid, 7),
        fileSize: utils.pad(input.length, 11),
        mtime: utils.pad(mtime, 11),
        checksum: '        ',
        type: '0', // just a file
        ustar: 'ustar  ',
        owner: opts.owner || '',
        group: opts.group || ''
      };

      // calculate the checksum
      checksum = 0;
      Object.keys(data).forEach(function (key) {
        var i, value = data[key], length;

        for (i = 0, length = value.length; i < length; i += 1) {
          checksum += value.charCodeAt(i);
        }
      });

      data.checksum = utils.pad(checksum, 6) + "\u0000 ";

      headerArr = header.format(data);

      var headerLength = Math.ceil( headerArr.length / recordSize ) * recordSize; 
      var inputLength = Math.ceil( input.length / recordSize ) * recordSize;
      
      this.length += inputLength + headerLength;
      this.blocks.push( { header: headerArr, input, headerLength, inputLength } );
    }
    
    save() {
      var buffers = [];
      var chunks = [];
      var length = 0;
      var max = Math.pow( 2, 20 );

      var chunk = [];
      this.blocks.forEach( function( b ) {
        if( length + b.headerLength + b.inputLength > max ) {
          chunks.push( { blocks: chunk, length: length } );
          chunk = [];
          length = 0;
        }
        chunk.push( b );
        length += b.headerLength + b.inputLength;
      } );
      chunks.push( { blocks: chunk, length: length } );

      chunks.forEach( function( c ) {
        var buffer = new Uint8Array( c.length );
        var written = 0;
        c.blocks.forEach( function( b ) {
          buffer.set( b.header, written );
          written += b.headerLength;
          buffer.set( b.input, written );
          written += b.inputLength;
        } );
        buffers.push( buffer );
      } );

      buffers.push( new Uint8Array( 2 * recordSize ) );

      return new Blob( buffers, { type: 'octet/stream' } );
    }

  }

  // import { logFrame } from './main.js';

  let state = {
    startTime: 0, // time for first frame
    currentTime: 0, // current faked time
    frameRate: 0, // recording frame rate
    frameTime: 0, // duration of a frame
    totalFrames: 0, // total frames to record. 0 means unbounded
    currentFrame: 0, // current recording frame,
    recording: false,
    startRecording: false, // used to wait for one update() after recording was triggered
    tarDownloadedSize: 0,
    tarMaxSize: 0,
    tarSequence: 0,
    tarFilename: '',
  };

  let tape; // Tarball (i.e. Tape ARchive)


  // Save original timing functions (on module load)
  const originalTimingFunctions = {
    requestAnimationFrame: window.requestAnimationFrame,
    performanceDotNow: window.performance.now,
    dateDotNow: window.Date.now
  };

  let requestAnimationFrameCallbacks = [];

  function hijackTimingFunctions() {
    window.requestAnimationFrame = function replacementRequestAnimationFrame(callback) {
      requestAnimationFrameCallbacks.push(callback);
    };
    // // Version of replacementRequestAnimationFrame with logging
    // window.requestAnimationFrame = function replacementRequestAnimationFrame(callback) {
    //   logFrame('hijacked requestAnimationFrame ' + state.currentTime);
    //   requestAnimationFrameCallbacks.push(callback);
    // };
    window.performance.now = function replacementPerformanceDotNow() {
      return state.currentTime;
    };
    window.Date.now = function replacementDateDotNow() {
      return state.currentTime;
    };
  }

  function resetTimingFunctions() {
    window.performance.now = originalTimingFunctions.performanceDotNow;
    window.requestAnimationFrame = originalTimingFunctions.requestAnimationFrame;
    window.Date.now = originalTimingFunctions.dateDotNow;
  }

  function callRequestAnimationFrameCallbacks() {
    requestAnimationFrameCallbacks.forEach( callback => {
      setTimeout(callback, 0, state.currentTime);
    });
    requestAnimationFrameCallbacks = [];
  }

  // // Version of callRequestAnimationFrameCallbacks with logging
  // function callRequestAnimationFrameCallbacks() {
  //   requestAnimationFrameCallbacks.forEach( callback => {
  //     logFrame('queuing anim callback ' + state.currentTime);
  //     setTimeout((time) => {
  //       logFrame('running anim callback ' + time);
  //       callback(time);
  //     }, 0, state.currentTime);
  //   });
  //   requestAnimationFrameCallbacks = [];
  // }


  let default_options = {
    start: undefined,
    duration: undefined,
    framerate: 30,
    chunk: 500,
  };

  function start(options) {
    options = Object.assign({}, default_options, options);
    console.log('rec: starting', options);
    
    // frame rate and time
    state.frameRate = options.framerate;
    state.frameTime = 1000 / state.frameRate;
    
    // start and current time
    if (options.start === undefined) {
      state.startTime = performance.now(); // no start time given, record from current time
    } else {
      state.startTime = options.start * 1000;
      console.log('setting start time', state.startTime);
    }
    state.currentTime = state.startTime;
    state.currentFrame = 0;
    
    // number of frames to record
    if (options.duration === undefined) {
      state.totalFrames = 0;
    } else {
      state.totalFrames = Math.ceil(options.duration * state.frameRate);
    }
    
    state.tarMaxSize = options.chunk;
    state.tarDownloadedSize = 0;
    state.tarSequence = 0;
    state.tarFilename = new Date().toISOString();
    
    hijackTimingFunctions();
    
    tape = new Tarball();
    
    createHUD();
    
    state.recording = false;
    state.startRecording = true;
  }


  function update(renderer) {
    if (state.startRecording) {
      state.recording = true;
      state.startRecording = false;
      // IMPORTANT: Skip recording this frame, just run callback
      // This frame still has unhijacked timing
      callRequestAnimationFrameCallbacks();
      return;
    }
    if (!state.recording) return;
    
    let canvas = renderer.domElement;
    
    // Capture a frame; numbering is currentFrame+1
    console.log('CAPTURING FRAME #' + (state.currentFrame+1) + ' TIME ' + state.currentTime);
    // console.assert(performance.now() === state.currentTime, "checking performance.now()");
    let filename = `${state.currentFrame+1}`.padStart(7,'0') + '.png';
    
    // saveCanvasToPNG(canvas, filename).then(() => {
    addPNGToTarball(canvas, filename).then(() => {
      // advance time
      state.currentTime += state.frameTime;
      state.currentFrame++;
      
      callRequestAnimationFrameCallbacks();
      
      // check for end of recording
      if (state.totalFrames > 0 && state.currentFrame >= state.totalFrames) {
        stop();
      } else if (tape.length / 1000000 >= state.tarMaxSize) {
        saveTarball();
      }
    });
    
    updateHUD();
  }


  function stop() {
    console.log('rec: stopping');
    resetTimingFunctions();
    
    state.recording = false;
    
    if (tape) {
      saveTarball({last:true});
    }
    
    updateHUD();
    hideHUD(60000 * 3);
  }


  function startstop(options) {
    if (!state.recording) {
      start(options);
    } else {
      stop();
    }
  }

  function now() {
    if (state.recording) {
      return state.currentTime;
    } else {
      return window.performance.now();
    }
  }

  function recording() {
    return state.recording;
  }

  function saveTarball(options = {last:false}) {
    let seq;
    if (options && options.last && state.tarSequence == 0) {
      seq = '';
    } else {
      seq = '_' + ('' + state.tarSequence++).padStart(3, '0');
    }
    saveBlob( tape.save(), state.tarFilename + seq + '.tar');
    state.tarDownloadedSize += tape.length;
    tape = new Tarball();
  }


  async function addPNGToTarball(canvas, filename) {
    return canvasToBlob(canvas, 'image/png')
      .then(blobToArrayBuffer)
      .then(buffer => {
        tape.append(filename, buffer);
      });
  }

  async function canvasToBlob(canvas, type) {
    return new Promise(resolve => {
      // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob
      canvas.toBlob(blob => resolve(blob), type);
    });
  }

  async function blobToArrayBuffer(blob) {
    return new Promise(resolve => {
      let f = new FileReader();
      f.onload = () => resolve(f.result);
      f.readAsArrayBuffer(blob);
    });
  }

  function saveURL(url, filename) {
    let link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
  }

  function saveBlob(blob, filename) {
    let url = URL.createObjectURL(blob);
    saveURL(url, filename);
    URL.revokeObjectURL(url);
  }

  let hud;

  function createHUD() {
    if (hud) return;
    hud = document.createElement( 'div' );
    hud.id = "rec-hud";
    hud.style.position = 'absolute';
    hud.style.left = hud.style.top = 0;
    hud.style.backgroundColor = 'black';
    hud.style.fontFamily = 'system-ui, monospace';
    hud.style.fontVariantNumeric = 'tabular-nums';
    hud.style.fontSize = '12px';
    hud.style.padding = '5px';
    hud.style.color = 'orangered';
    hud.style.zIndex = 1;
    document.body.appendChild( hud );
  }

  function updateHUD() {
    hud.style.display = 'block';
    hud.style.color = state.recording ? 'orangered' : 'gainsboro';
    
    let frames = (state.currentFrame + '').padStart(7,'0');
    frames += state.totalFrames > 0 ? '/' + state.totalFrames : '';
    let clock = new Date(state.currentTime - state.startTime).toISOString().substr(14, 5);
    let intraSecondFrame = (state.currentFrame % state.frameRate + '').padStart(2, '0');
    let dataAmount = dataAmountString(state.tarDownloadedSize + tape.length);
    // eslint-disable-next-line no-irregular-whitespace
    hud.textContent = `●REC ${clock}.${intraSecondFrame} #${frames} ${dataAmount}`; // shows number of COMPLETE frames
  }

  function hideHUD(time = 0) {
    setTimeout(() => {
      hud.style.display = 'none';
    }, time);
  }


  function dataAmountString(numBytes, mbDecimals = 1, gbDecimals = 2) {
    let mb = numBytes / 1000000;
    let gb = mb / 1000;
    return gb < 1 ? mb.toFixed(mbDecimals) + ' MB': gb.toFixed(gbDecimals) + ' GB';
  }

  exports.start = start;
  exports.update = update;
  exports.stop = stop;
  exports.startstop = startstop;
  exports.now = now;
  exports.recording = recording;

  return exports;

}({}));
//# sourceMappingURL=recorder.iife.js.map
