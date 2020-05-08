/*
Copyright 2019 Google LLC. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * This sample demonstrates how to build your own Receiver for use with Google
 * Cast.
 */

'use strict';

import { CastQueue } from './queuing.js';

const CUSTOM_CHANNEL = "urn:x-cast:com.kff.test";

const context = cast.framework.CastReceiverContext.getInstance();

function ovshow(p) {
    let r = document.getElementById("mytext2").style.display = p ? "block" :"none";
    return r;
}
ovshow(true);

// all of these do not work; the CastDebugLogger instance must be initialized earlier
if (context.getDeviceCapabilities()) {
    console.log("before: is_device_registered " + context.getDeviceCapabilities().is_device_registered);
    //context.getDeviceCapabilities().is_device_registered = true;
    context.getDeviceCapabilities_ = context.getDeviceCapabilities;
    context.getDeviceCapabilities = function() { let t=this.getDeviceCapabilities_(); t.is_device_registered=true; return t;};
    console.log("after: is_device_registered " +  context.getDeviceCapabilities().is_device_registered);
}

const playerManager = context.getPlayerManager();


context.addCustomMessageListener(CUSTOM_CHANNEL, 
    function(e) { 
        console.log("EVENT", e);
        if (e && e.data) {
            let resp = null;
            if (e.data.command == "test") {
                resp = {
                    type: 'status',
                    message: playerManager && playerManager.getCurrentTimeSec()
                } 
            } else if (e.data.command == "show") {
                let msg = ovshow(e.data.value); 
                resp = {
                    type: 'myoverlay',
                    message: msg 
                } 
            }
            let recipient = e.senderId;
            if (resp) {
                context.sendCustomMessage(
                  CUSTOM_CHANNEL,
                  recipient,
                  resp);
            }
        }
    });

const LOG_RECEIVER_TAG = 'Receiver';

/**
 * Debug Logger
 */
const castDebugLogger = cast.debug.CastDebugLogger.getInstance();
if (!castDebugLogger.B) {
  console.log("Hack 1 did not work, trying hack 2");
  castDebugLogger.B = 1;
}


/**
 * WARNING: Make sure to turn off debug logger for production release as it
 * may expose details of your app.
 * Uncomment below line to enable debug logger and show a 'DEBUG MODE' tag at
 * top left corner.
 */
castDebugLogger.setEnabled(true);

/**
 * Uncomment below line to show debug overlay.
 */
castDebugLogger.showDebugLogs(true);

/**
 * Set verbosity level for Core events.
 */
castDebugLogger.loggerLevelByEvents = {
  'cast.framework.events.category.CORE': 
    cast.framework.LoggerLevel.INFO,
  'cast.framework.events.EventType.MEDIA_STATUS': 
    cast.framework.LoggerLevel.DEBUG
};

if (!castDebugLogger.loggerLevelByTags) {
  castDebugLogger.loggerLevelByTags = {};
}

/**
 * Set verbosity level for custom tag.
 * Enables log messages for error, warn, info and debug.
 */
castDebugLogger.loggerLevelByTags[LOG_RECEIVER_TAG] = 
  cast.framework.LoggerLevel.DEBUG;

/**
 * Example of how to listen for events on playerManager.
 */
playerManager.addEventListener(
  cast.framework.events.EventType.ERROR, (event) => {
    castDebugLogger.error(LOG_RECEIVER_TAG,
      'Detailed Error Code - ' + event.detailedErrorCode);
    if (event && event.detailedErrorCode == 905) {
      castDebugLogger.error(LOG_RECEIVER_TAG,
        'LOAD_FAILED: Verify the load request is set up ' +
        'properly and the media is able to play.');
    }
});

/**
 *  playerManager listen for TIME_UPDATE
 */
if (false) {
playerManager.addEventListener(
  cast.framework.events.EventType.TIME_UPDATE, (event) => {
    // castDebugLogger.info(LOG_RECEIVER_TAG,
    //  'TIME_UPDATE ' + event.currentMediaTime);
    document.getElementById("mytext2").innerHTML = `time: ${event.currentMediaTime}`;
});
}

/**
 *  playerManager requestAnimationFrame
 */
if (true) {
    let t0 = 0, sec = 0, avg = 0, prev = 0, skipped = 0, fcnt = 0;
    function onUpdate(t) {
        let dt = t - t0;
        avg = 0.9 * avg + 0.1 * dt; 
        t0 = t;
        fcnt++;
        if (playerManager) {
            let ct = playerManager.getCurrentTimeSec();
            if (ct == prev) {
                // number of times the current time was not updated (or paused)
                ++skipped;
            } 
            prev = ct;
            //let at = playerManager.getAbsoluteTimeForMediaTime(ct);
            //document.getElementById("mytext").innerHTML = `at: ${at} ct: ${ct}`;
            let nsec = Math.floor(t / 1000);
            if (nsec != sec) {
                sec = nsec;

                let fps = ((avg > 0) ? 1000 / avg : 0).toFixed(1);
                let cts = ct.toFixed(2);
                document.getElementById("mytext2").innerHTML = `ct: ${cts} fps.avg: ${fps} [${fcnt}] time not updated: ${skipped}`;
                fcnt = 0;
                skipped = 0;
            }

        }
        window.requestAnimationFrame(onUpdate);
    }
    
    window.requestAnimationFrame(onUpdate);
}



/**
 * Intercept the LOAD request to be able to read in a contentId and get data.
 */
playerManager.setMessageInterceptor(
  cast.framework.messages.MessageType.LOAD, loadRequestData => {
    castDebugLogger.debug(LOG_RECEIVER_TAG,
      `LOAD interceptor loadRequestData: ${JSON.stringify(loadRequestData)}`);
    if (!loadRequestData || !loadRequestData.media) {
      const error = new cast.framework.messages.ErrorData(
        cast.framework.messages.ErrorType.LOAD_FAILED);
      error.reason = cast.framework.messages.ErrorReason.INVALID_REQUEST;
      castDebugLogger.error(LOG_RECEIVER_TAG, 'Invalid load request');
      return error;
    }
    if (!loadRequestData.media.contentUrl) {
      castDebugLogger.warn(LOG_RECEIVER_TAG,
        'Playable URL is missing. Using ContentId as a fallback.');
      if (!loadRequestData.media.contentId) {
        castDebugLogger.error(LOG_RECEIVER_TAG,
          'Missing Content ID and Playable URL.');
      }
    }
    return loadRequestData;
  });

const playbackConfig = new cast.framework.PlaybackConfig();

/**
 * Set the player to start playback as soon as there are five seconds of
 * media content buffered. Default is 10.
 */
playbackConfig.autoResumeDuration = 5;
castDebugLogger.info(LOG_RECEIVER_TAG,
  `autoResumeDuration set to: ${playbackConfig.autoResumeDuration}`);

/**
 * Set the control buttons in the UI controls.
 */
const controls = cast.framework.ui.Controls.getInstance();
controls.clearDefaultSlotAssignments();

/**
 * Assign buttons to control slots.
 */
controls.assignButton(
  cast.framework.ui.ControlsSlot.SLOT_1,
  cast.framework.ui.ControlsButton.QUEUE_PREV
);
controls.assignButton(
  cast.framework.ui.ControlsSlot.SLOT_2,
  cast.framework.ui.ControlsButton.CAPTIONS
);
controls.assignButton(
  cast.framework.ui.ControlsSlot.SLOT_3,
  cast.framework.ui.ControlsButton.SEEK_FORWARD_15
);
controls.assignButton(
  cast.framework.ui.ControlsSlot.SLOT_4,
  cast.framework.ui.ControlsButton.QUEUE_NEXT
);

context.start({
  queue: new CastQueue(),
  playbackConfig: playbackConfig,
  supportedCommands: cast.framework.messages.Command.ALL_BASIC_MEDIA |
                      cast.framework.messages.Command.QUEUE_PREV |
                      cast.framework.messages.Command.QUEUE_NEXT,
  customNamespaces: { [CUSTOM_CHANNEL]: cast.framework.system.MessageType.JSON }
});
