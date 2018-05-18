'use strict';

var assert = require('assert');
var http = require('http');
var Agent = require('agentkeepalive');
var urllib = require('..');

describe('test/keep-alive-header.test.js', function() {
  var port;
  var server;
  var timer;
  before(function(done) {
    server = http.createServer(function(req, res) {
      if (server.keepAliveTimeout) {
        res.setHeader('Keep-Alive', 'timeout=' + parseInt(server.keepAliveTimeout / 1000));
      }
      res.end('Hello World, ' + req.connection.remotePort);
    });
    server.on('clientError', function(err, socket) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });
    server.keepAliveTimeout = 1000;
    server.listen(0, function(err) {
      port = server.address().port;
      done(err);
    });
  });
  after(function() {
    clearInterval(timer);
  });

  it('should handle Keep-Alive header and not throw reset error', function(done) {
    var keepaliveAgent = new Agent({
      keepAlive: true,
    });

    var count = 0;
    function request() {
      count++;
      urllib.request('http://127.0.0.1:' + port + '/foo', {
        method: 'GET',
        agent: keepaliveAgent,
        dataType: 'text',
      }, function(err, text, res) {
        assert(!err);
        assert(res.status === 200);
        console.log('[%s] status: %s, text: %s, headers: %j', count, text, res.status, res.headers);
        assert(res.headers.connection === 'keep-alive');
        assert(res.headers['keep-alive'] === 'timeout=1');
        if (count > 5) {
          done();
        }
      });
    }

    timer = setInterval(request, server.keepAliveTimeout);
    request();
  });
});