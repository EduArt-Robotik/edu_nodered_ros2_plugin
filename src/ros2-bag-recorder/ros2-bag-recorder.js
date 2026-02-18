const { log } = require('console');

// RED argument provides the module access to Node-RED runtime api
module.exports = function(RED)
{
    const spawn = require('child_process').spawn;
    const path = require('path');

    /*
     * @function ROS2BagRecorder constructor
     * This node is defined by the constructor function ROS2BagRecorder,
     * which is called when a new instance of the node is created
     *
     * @param {Object} config - Contains the properties set in the flow editor
     */
    function ROS2BagRecorder(config)
    {
        // Initiliaze the features shared by all nodes
        RED.nodes.createNode(this, config);
        var node = this;
        var child = null;
        var stopping = false;
        var lastOutput = "";  // Store last output for tooltip
        node.bagFolder = config.bagFolder || "";
        node.bagFileName = "";
        node.topics = Array.isArray(config.topics) ? config.topics : [];

        var stopProcess = function()
        {
            if (!child) {
                return;
            }

            stopping = true;
            node.status({ fill: "grey", shape: "ring", text: "stopping" });

            try {
                child.kill('SIGINT');
            } catch (err) {
                node.warn("Failed to stop process: " + err.message);
            }
        };

        var startProcess = function(args)
        {
            if (child) {
                return;
            }

            stopping = false;
            var cmdArgs = ['bag', 'record'];
            var outputPath = node.bagFileName && node.bagFileName.trim() !== '' ? node.bagFileName.trim() : "";
            if (outputPath && node.bagFolder && node.bagFolder.trim() !== '') {
                outputPath = path.join(node.bagFolder.trim(), outputPath);
            }
            if (outputPath) {
                cmdArgs.push('-o');
                cmdArgs.push(outputPath);
            }
            
            // Add topics
            if (Array.isArray(args)) {
                cmdArgs = cmdArgs.concat(args);
            }
            
            child = spawn('ros2', cmdArgs, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            node.status({ fill: "green", shape: "dot", text: "recording" });

            child.stdout.on('data', function(data) {
                lastOutput = data.toString().trim();
                node.debug(lastOutput);
                // Update status with last output line as tooltip
                node.status({ fill: "green", shape: "dot", text: "recording", tooltip: lastOutput });
            });

            child.stderr.on('data', function(data) {
                lastOutput = data.toString().trim();
                node.warn(lastOutput);
                // Update status with last error line as tooltip
                node.status({ fill: "yellow", shape: "dot", text: "recording", tooltip: "⚠ " + lastOutput });
            });

            child.on('exit', function(code, signal) {
                child = null;
                if (stopping) {
                    node.status({ fill: "grey", shape: "ring", text: "stopped", tooltip: lastOutput });
                } else {
                    node.status({ fill: "red", shape: "ring", text: "exited", tooltip: "Exit code: " + code + ", Signal: " + signal });
                }
                node.debug("ros2 bag record exited (code=" + code + ", signal=" + signal + ")");
            });
        };

        // Event emitted when the deploy is finished
        RED.events.once("flows:started", function() {
            node.status({ fill: "green", shape: "dot", text: ""});
        });

	    // Registers a listener to the input event,
        // which will be called whenever a message arrives at this node
        node.on('input', function(msg, send, done) {
            // Define output message
            msg_out = msg;
            console.debug("Received message: " + JSON.stringify(msg));

            // Input 2: Bag filename
            if (msg.payload.filename && typeof msg.payload.filename === 'string') {
                node.bagFileName = msg.payload.filename;
                node.debug("Updated bag filename to: " + node.bagFileName);
            }
            // Input 1: Control commands (start/stop)
            else if (msg.payload.command && typeof msg.payload.command === 'string') {
                var action = msg.payload.command.toLowerCase();

                // Stopping the recording
                if (action === 'stop') {
                    stopProcess();
                    msg_out.payload = { status: "stopped" };
                }
                // If the process is not running, start it with the current topics
                else if (action === 'start' && !child) {
                    var args = node.topics.slice();
                    startProcess(args);
                    msg_out.payload = { status: "recording", topics: args };
                }
                // handle unknown commands
                else {
                    node.warn("Unknown command: " + msg.payload.command);
                    node.status({ fill: "yellow", shape: "dot", text: "unknown command", tooltip: "Received command: " + msg.payload.command });
                }
            }

            // Passes the message to the next node in the flow
            node.send(msg_out);

            // Indicates that the processing of the message is complete
            if (done) {
                done();
            }
        });

        // Called when there is a re-deploy or the program is closed
        node.on('close', function() {
            stopProcess();
            node.status({ fill: null, shape: null, text: ""});            
        });
    }

    // The node is registered in the runtime using the name publisher
    RED.nodes.registerType("ROS2 Bag Recorder", ROS2BagRecorder);
}
