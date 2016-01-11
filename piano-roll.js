//! piano-roll.js
//! version : 0.2.0
//! author : Mike Dominice <mike@mikedominice.com>
//! license : MIT
//! github.com/mdomi/piano-roll

/* jshint browser: true */
(function (window, document) {
    'use strict';

    var BLACK = 'BLACK',
        WHITE = 'WHITE',
        NOTE_VALUE_C3 = 48,
        NOTE_ON = 0x90,
        NOTE_OFF = 0x80,
        NOTE_VELOCITY_128 = 0x7f,
        BLACK_KEY_SIZE = 0.6;

    function setAttribute(element, key, value) {
        if (typeof key === 'object') {
            Object.keys(key).forEach(function (subKey) {
                setAttribute(element, subKey, key[subKey]);
            });
        } else {
            element.setAttribute(key, value);
        }
        return element;
    }

    function createSVGElement(name, attrs) {
        var element = document.createElementNS('http://www.w3.org/2000/svg', name);
        if (attrs) {
            setAttribute(element, attrs);
        }
        return element;
    }

    function createSVGRootElement(options) {
        return createSVGElement('svg', {
            class : 'piano-roll',
            width : getWidth(options),
            height : options.height
        });
    }

    function getWidth(options) {
        return options.octaves * 7 * options.keyWidth;
    }

    function isNumber(value) {
        return typeof value === 'number';
    }

    function isFunction(value) {
        return typeof value === 'function';
    }

    function buildOptions(options) {
        var opts = {
            height : 50,
            keyWidth : 12,
            onmidimessage : function () {},
            startNote : NOTE_VALUE_C3,
            octaves : 2,
            passThrough : true
        };
        if (options) {
            opts.height = options.height || opts.height;

            if (isFunction(options.onmidimessage)) {
                opts.onmidimessage = options.onmidimessage;
            }
            if (isNumber(options.keyWidth)) {
                opts.keyWidth = options.keyWidth;
            }
            if (isNumber(options.startNote)) {
                opts.startNote = options.startNote;
            }
            if (isNumber(options.octaves)) {
                opts.octaves = options.octaves;
            }
        }
        return opts;
    }

    function getKey(pianoRoll, note) {
        return pianoRoll.keys[note - pianoRoll.options.startNote];
    }

    function getKeyIndex(pianoRoll, key) {
        return indexOf(pianoRoll.keys, key);
    }

    function getKeyNote(pianoRoll, key) {
        return getKeyIndex(pianoRoll, key) + pianoRoll.options.startNote;
    }

    function noteOn(pianoRoll, data) {
        var key = getKey(pianoRoll, data[1]);
        if (key) {
            key.classList.add('active');
        }
    }

    function noteOff(pianoRoll, data) {
        var key = getKey(pianoRoll, data[1]);
        if (key) {
            key.classList.remove('active');
        }
    }

    function indexOf(array, value) {
        return Array.prototype.indexOf.call(array, value);
    }

    function sendMIDIMessage(pianoRoll, key, status) {
        pianoRoll.options.onmidimessage({
            data : new Uint8Array([
                status,
                getKeyNote(pianoRoll, key),
                NOTE_VELOCITY_128
            ])
        });
    }

    function addEventListener(pianoRoll, eventName, callback) {
        var attachedCallback = callback.bind(pianoRoll);
        pianoRoll.element.addEventListener(eventName, attachedCallback);
        pianoRoll._cleanups = (pianoRoll._cleanups || []).concat([
            function () {
                pianoRoll.element.removeEventListener(eventName, attachedCallback);
            }
        ]);
    }

    function PianoRoll(element, options) {
        if (!(this instanceof PianoRoll)) {
            return new PianoRoll(element, options);
        }

        this.element = element;
        this.options = buildOptions(options);

        this.init();

        addEventListener(this, 'mousedown', function (e) {
            if (e.target.classList.contains('piano-roll-key')) {
                e.target.classList.add('active');
                sendMIDIMessage(this, e.target, NOTE_ON);
            }
        });

        addEventListener(this, 'mouseup', function (e) {
            if (e.target.classList.contains('piano-roll-key')) {
                e.target.classList.remove('active');
                sendMIDIMessage(this, e.target, NOTE_OFF);
            }
        });
    }

    function statusIs(data, status) {
        return (data[0] & 0xf0) === status;
    }

    var KEY_FACTORY = {
        WHITE : function whiteKey(options) {
            return createSVGElement('rect', {
                class : 'piano-roll-key piano-roll-white-key',
                width : options.keyWidth,
                height : options.height,
                x : options.x
            });
        },
        BLACK : function blackKey(options) {
            var width = BLACK_KEY_SIZE * options.keyWidth;
            return createSVGElement('rect', {
                class : 'piano-roll-key piano-roll-black-key',
                width : width,
                height : 0.5 * options.height,
                x : options.x - (width / 2)
            });
        }
    };

    var OCTAVE_CONFIG = [
        WHITE, BLACK, WHITE, BLACK, WHITE,
        WHITE, BLACK, WHITE, BLACK, WHITE, BLACK, WHITE
    ];

    function buildAndAdvanceKey(pianoRoll, i, x) {
        var type = keyType(i);
        var key = KEY_FACTORY[type]({
                keyWidth : pianoRoll.options.keyWidth,
                height : pianoRoll.options.height,
                x : x
            });

        pianoRoll.keys.push(key);

        if (type === BLACK) {
            pianoRoll.blackKeys.push(key);
        }
        if (type === WHITE) {
            pianoRoll.whiteKeys.push(key);
            x = x + pianoRoll.options.keyWidth;
        }
        return x;
    }

    function keyType(i) {
        return OCTAVE_CONFIG[i % OCTAVE_CONFIG.length];
    }

    PianoRoll.prototype = {
        init : function () {
            var x = 0;

            this.svg = createSVGRootElement(this.options);
            this.keys = [];
            this.blackKeys = [];
            this.whiteKeys = [];

            var startNote = this.options.startNote,
                endNote = startNote + 12 * this.options.octaves;

            for (var i = startNote; i < endNote; i = i + 1) {
                x = buildAndAdvanceKey(this, i, x);
            }

            this.whiteKeys.forEach(function (key) {
                this.svg.appendChild(key);
            }.bind(this));

            this.blackKeys.forEach(function (key) {
                this.svg.appendChild(key);
            }.bind(this));

            this.element.appendChild(this.svg);
        },
        send : function (data, timestamp) {
            if (statusIs(data, NOTE_ON)) {
                noteOn(this, data, timestamp);
            }
            if (statusIs(data, NOTE_OFF)) {
                noteOff(this, data, timestamp);
            }
            if (this.options.passThrough) {
                this.options.onmidimessage({
                    data : data,
                    timestamp : timestamp
                });
            }
        },
        clear : function () {},
        destroy : function () {
            (this._cleanups || []).forEach(function (cleanup) {
                cleanup();
            });
            this.keys = [];
            this.blackKeys = [];
            this.whiteKeys = [];
            this.element.removeChild(this.svg);
        }
    };

    window.PianoRoll = PianoRoll;

}(window, window.document));
