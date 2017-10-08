




var fs = require("fs");   //require lädt irgendwelche scheis module
var http = require("http");  // https require https
var path = require("path");

var sessions = {};
var usersInSessionLimit = 2;


var ipaddress = '0.0.0.0';
var port      = 8080;

        if (typeof ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            ipaddress = "127.0.0.1";
        };


//if (process.argv.length == 3) {
//    port = process.argv[2];
//}

var serverDir = path.dirname(__filename)
var clientDir = path.join(serverDir, "client/");

var contentTypeMap = {
    ".html": "text/html;charset=utf-8",
    ".js": "text/javascript",
    ".css": "text/css"
};

//var options = {
  //key: fs.readFileSync(path.join(__dirname,'pem','key.pem')), // und http zu https ändern
  //cert: fs.readFileSync(path.join(__dirname,'pem','crt.pem'))
  //,requestCert: false
  //,rejectUnauthorized: false};
                            //options,
var server = http.createServer(function (request, response) {//On line 2, the HTTP server is created using the http module’s 
    //createServer() method. Like most Node.js functions, createServer() takes a callback function as an argument. This callback 
    //function is executed each time the server receives a new request.
//The callback function takes two arguments, request and response. 
    //The request object contains information regarding the client’s request, such as the URL, HTTP headers, 
    //and much more. Similarly, the response object is used to return data back to the client.


    var headers = {//long with the status code, the server returns a number of HTTP headers which 
        //define the parameters of the response. If you do not specify headers, Node.js will implicitly 
        //send them for you. The example server specifies only the Content-Type header. This particular 
        //header defines the MIME type of the response. In the case of an HTML response, the MIME type is “text/html”.
        "Cache-Control": "no-cache, no-store",
        "Pragma": "no-cache",
        "Expires": "0"
    };

    var parts = request.url.split("/");
    // handle "client to server" and "server to client"
    if (parts[1] == "ctos" || parts[1] == "stoc") {  //  ||  oder..
        var sessionId = parts[2];
        var userId = parts[3];
         console.log("wannkommtdiekacke an"+parts);
        if (!sessionId || !userId) {
            response.writeHead(400);//The callback function begins by calling the response.writeHead() method.
            // This method sends an HTTP status code and a collection of response headers back to the client.
            // The status code is used to indicate the result of the request. For example, everyone has encountered
            // a 404 error before, indicating that a page could not be found. The example server returns the code 200, which indicates success.
            response.end();
            return;
        }

        if (parts[1] == "stoc") {//kann eigentlich nur vom android client kommen^^
            console.log("@" + sessionId + " - " + userId + " joined.");

            headers["Content-Type"] = "text/event-stream";
            response.writeHead(200, headers);
            function keepAlive(resp) {
                resp.write(":\n");
                resp.keepAliveTimer = setTimeout(arguments.callee, 7000, resp);
            }
            keepAlive(response);  // flush headers + keep-alive

            var session = sessions[sessionId];
            if (!session)
                session = sessions[sessionId] = {"users" : {}};//könnte die erzeugung einer hash map sein zum speichern der clienten
       
           

            if ((Object.keys(session.users).length > usersInSessionLimit - 1)) {
                console.log("user limit for session reached (" + usersInSessionLimit + ")");
                response.write("event:busy\ndata:" + sessionId + "\n\n");
                //Next, the server executes several calls to response.write(). 
                //These calls are used to write the HTML page. By default, UTF-8 character encoding is used.
                // Technically, all of these calls could be combined into a single call to improve performance. 
                //However, for such a trivial example, performance has been sacrificed for the sake of code readability.
                clearTimeout(response.keepAliveTimer);
                response.end();
                return;
            }

            var user = session.users[userId];
            if (!user) {
                console.log("Usergibtsnochnicht");
                user = session.users[userId] = {};
                for (var pname in session.users) {
                    var esResp = session.users[pname].esResponse;
                    if (esResp) {
                        clearTimeout(esResp.keepAliveTimer);
                        keepAlive(esResp);
                        esResp.write("event:join\ndata:" + userId + "\n\n");
                        response.write("event:join\ndata:" + pname + "\n\n");
                    }
                }
            }
            else if (user.esResponse) {
                console.log("usergibtsschon");
                user.esResponse.end();
                clearTimeout(user.esResponse.keepAliveTimer);
                user.esResponse = null;
            }
            user.esResponse = response;//////////////////////////////////////////////////////////////////////////////////

            request.on("close", function () {
                for (var pname in session.users) {
                    if (pname == userId)
                        continue;
                    var esResp = session.users[pname].esResponse;
                    esResp.write("event:leave\ndata:" + userId + "\n\n");
                }
                delete session.users[userId];
                clearTimeout(response.keepAliveTimer);
                console.log("@" + sessionId + " - " + userId + " left.");
                console.log("users in session " + sessionId + ": " + Object.keys(session.users).length);
            });

        } else { // parts[1] == "ctos"  // wenn ub auf der webseite auf join clickt kommt/ctos/session/userId usw an
            var peerId = parts[4];
            var peer;
            var session = sessions[sessionId];
            if (!session || !(peer = session.users[peerId])) {
                response.writeHead(400, headers);
                response.end();
                return;
            }

            var body = "";
            request.on("data", function (data) { body += data; });//The on method binds an event to a object. 
            //It is a way to express your intent if there is something happening (data sent or error in your case) ,
            // then execute the function added as a parameter. This style of programming is called Event-driven programming.
             //   zahl1+=zahl2 wirkt wie zahl1=zahl1+zahl2. Der Zuweisungsoperator += erhöht den Wert der links stehenden Variablen
             // um den Wert des rechts stehenden Operanden.    string1+=ausdruck wirkt wie string1=string1+ausdruck. An den Wert der
             // Stringvariablen links vom Operator wird der String-Wert von ausdruck gehängt und dieser neue verkettete String der
             // Variablen string1 zugeweisen. Genauso kann man Subtraktionen, Multiplikationen oder Divisionen auf diese Weise als 
             //Zuweisung schreiben, dafür dienen entsprechend die Operatoren -=, *= und /=.

            request.on("end", function () {
                console.log("@" + sessionId + " - " + userId + " => " + peerId + " :");
                // console.log(body);
                var evtdata = "data:" + body.replace(/\n/g, "\ndata:") + "\n";
                peer.esResponse.write("event:user-" + userId + "\n" + evtdata + "\n");
            });

            // to avoid "no element found" warning in Firefox (bug 521301)
            headers["Content-Type"] = "text/plain";
            response.writeHead(204, headers);
            response.end();
        }

        return;
    }

    var url = request.url.split("?", 1)[0];
   var filePath = path.join(clientDir, url);
    if (filePath.indexOf(clientDir) != 0 || filePath == clientDir)
        filePath = path.join(clientDir, "/webrtc_example.html");//  
console.log("megashit");
    fs.stat(filePath, function (err, stats) {
        if (err || !stats.isFile()) {
            response.writeHead(404);
            response.end("404 Not found");
            return;
        }

        var contentType = contentTypeMap[path.extname(filePath)] || "text/plain";
        response.writeHead(200, { "Content-Type": contentType });

        var readStream = fs.createReadStream(filePath);
        readStream.on("error", function () {
            response.writeHead(500);
            response.end("500 Server error");//However, end() can also be called like write(), assuming only one call is needed.
        });
        readStream.pipe(response);
    });
});

console.log('The server is listening on port ' + port);
server.listen(port,ipaddress);
console.log('Server running at hxxxxxxx/');
