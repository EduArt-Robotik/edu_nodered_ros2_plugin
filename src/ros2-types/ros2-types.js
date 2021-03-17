// RED argument provides the module access to Node-RED runtime api
module.exports = function(RED)
{
    var fs = require('fs');
    var home = process.env.HOME;
    var ros2_home = process.env.AMENT_PREFIX_PATH;
    var packages_path = "";
    var idl_path = "";

    /* 
     * @function ROS2Types constructor
     * This node is defined by the constructor function ROS2Types, 
     * which is called when a new instance of the node is created
     * 
     * @param {Object} config - Contains the properties set in the flow editor
     */
    function ROS2Types(config)
    {
        // Initiliaze the features shared by all nodes
        RED.nodes.createNode(this, config);
        var node = this;

	    // Registers a listener to the input event, 
        // which will be called whenever a message arrives at this node
        node.on('input', function(msg) 
        {
            node.status({ fill: "green", shape: "dot", text: "message"});

            // Passes the message to the next node in the flow
            node.send(msg);
        });
    }

    // The node is registered in the runtime using the name publisher
    RED.nodes.registerType("ROS2 Type", ROS2Types);

    //Function that pass the IS ROS 2 compiled packages to the html file
    RED.httpAdmin.get("/ros2packages", RED.auth.needsPermission('ROS2 Type.read'), function(req,res) 
    {
        var rosidl_path = home + "/rosidl_msgs_path.txt";
        //Gets the .mix path from rosidl_msgs_path.txt
        var line  = fs.readFileSync(rosidl_path).toString();
        var index = line.indexOf('\n');
        packages_path = line;
        if (index != -1)
        {
            packages_path = line.substr(0, index);
            idl_path = line.substr(index+1, line.length-1);
        }
        var files = fs.readdirSync(packages_path);
        
        res.json(files);
    });

    //Function that pass the IS ROS 2 package compiled msgs to the html file
    RED.httpAdmin.get("/ros2msgs", RED.auth.needsPermission('ROS2 Type.read'), function(req,res) 
    {
        var msgs_path = packages_path + "/" + req.query["package"];
        
        var files = fs.readdirSync(msgs_path);
        res.json(files);
    });

    //Function that pass the selected message idl and msg codes
    RED.httpAdmin.get("/msgidl", RED.auth.needsPermission('ROS2 Type.read'), function(req,res) 
    {
        //IDL
        var index = idl_path.indexOf('\n');
        if (index != -1)
        {
            idl_path = idl_path.substr(0, index);
        }
        var hpp_msg_path = idl_path + "/" + req.query["package"] + "/msg/convert__msg__" + req.query["msg"] + ".hpp";
        
        var content = fs.readFileSync(hpp_msg_path).toString();
        var idl_begin = content.indexOf("~~~(");
        if (idl_begin != -1)
        {
            content = content.substr(idl_begin+4); //Remove also the '~~~(' characters
        }
        var idl_end = content.indexOf(")~~~");
        var json_data = {}
        if (idl_end != -1)
        {
            var idl = content.substr(0, idl_end);
            json_data["idl"] = idl;
        }

        //MSG
        hpp_msg_path = ros2_home + "/share/" + req.query["package"] + "/msg/" + req.query["msg"] + ".msg";
            
        var content = fs.readFileSync(hpp_msg_path).toString();
        json_data["msg"] = content;
        res.json(json_data);
    });
}