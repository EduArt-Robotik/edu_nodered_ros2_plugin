// RED argument provides the module access to Node-RED runtime api
module.exports = function(RED)
{
    const execFile = require('child_process').execFile;    
    var package_list = [];
    var interface_list = [];

    /*
     * @function ROS2ActionTypes constructor
     * This node is defined by the constructor function ROS2ActionTypes,
     * which is called when a new instance of the node is created
     *
     * @param {Object} config - Contains the properties set in the flow editor
     */
    function ROS2ActionTypes(config)
    {
        // Initiliaze the features shared by all nodes
        RED.nodes.createNode(this, config);
        var node = this;

        // Event emitted when the deploy is finished
        RED.events.once("flows:started", function() {
            node.status({ fill: "green", shape: "dot", text: ""});
        });

	    // Registers a listener to the input event,
        // which will be called whenever a message arrives at this node
        node.on('input', function(msg) {
            // Passes the message to the next node in the flow
            node.send(msg);
        });

        // Called when there is a re-deploy or the program is closed
        node.on('close', function() {
            node.status({ fill: null, shape: null, text: ""});            
        });
    }

    // The node is registered in the runtime using the name publisher
    RED.nodes.registerType("ROS2 Action Type", ROS2ActionTypes);

    // Function that pass the IS ROS 2 compiled packages to the html file
    RED.httpAdmin.get("/ros2actionpackages", RED.auth.needsPermission('ROS2 Action Type.read'), function(req,res)
    {
        if (package_list.length > 0) {
            // Uses previous estimated message package list.
            console.log("uses previous estimated action package list:");
            console.log(package_list);
            res.json(package_list);
            return;
        }

        console.log("Estimate all packages that provide actions.");
        execFile("ros2", ["interface", "list"], function(error, stdout, stderr) {    
            var found_service_start = false;
            
            stdout.split('\n').forEach(line => {
                if (found_service_start == false && line.includes("Actions:")) {
                    // found start of services --> processing list at next iteration
                    found_service_start = true;
                    return;
                }
                if (found_service_start == false) {
                    // no action --> no processing
                    return;
                }
                if (found_service_start == true && line.includes("/") == false) {
                    // end of services reached --> stop processing
                    found_service_start = false;
                    return;
                }

                line = line.trim();
                let package = line.split('/')[0]

                if (package_list.includes(package) == false) {
                    package_list.push(package);
                }
            });

            console.log("Found following packages that provide actions:");
            console.log(package_list);
            res.json(package_list);
        });
    });

    // Function that pass the IS ROS 2 package compiled actions to the html file
    RED.httpAdmin.get("/ros2actions", RED.auth.needsPermission('ROS2 Action Type.read'), function(req,res)
    {
        if (interface_list[req.query["package"]] != undefined) {
            // Uses previous estimated message list.
            console.log("uses already estimated action list:");
            console.log(interface_list[req.query["package"]]);
            res.json(interface_list[req.query["package"]]);
            return;
        }

        console.log("Estimate all actions that is provided by package '" + req.query["package"] + "':");
        execFile("ros2", ["interface", "list"], function(error, stdout, stderr) {    
            var found_service_start = false;
            var action_list = [];
            
            stdout.split('\n').forEach(line => {
                if (found_service_start == false && line.includes("Actions:")) {
                    // found start of services --> processing list at next iteration
                    found_service_start = true;
                    return;
                }
                if (found_service_start == false) {
                    // no services --> no processing
                    return;
                }

                line = line.trim();
                line_parts = line.split('/');

                if (line_parts[0] == req.query['package']) {
                    action_list.push(line_parts[2]);
                }
            });

            console.log("Found following actions that is provided by package '" + req.query["package"] + "':");
            console.log(action_list);
            interface_list[req.query["package"]] = action_list;            
            res.json(action_list);
        });
    });
}
