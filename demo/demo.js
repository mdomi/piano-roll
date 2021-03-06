/* jshint browser: true */
(function (window, document, MIDIKeys, PianoRoll) {
    'use strict';

    var pianoRoll = new PianoRoll(document.getElementById('piano-roll-1'), {
        octaves : 3,
        height : 100,
        keyWidth : 23
    });

    var midiKeys = new MIDIKeys(document.body, {
    });

    midiKeys.option('onmidimessage', function (e) {
        pianoRoll.send(e.data, e.timestamp);
    });

    window.pianoRoll = pianoRoll;

}(window, window.document, window.MIDIKeys, window.PianoRoll));
