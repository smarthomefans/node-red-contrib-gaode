module.exports = function (RED) {
    var axios = require('axios');

    function gaodeNode(config) {
        RED.nodes.createNode(this, config);

        // Retrieve the config node
        this.server = RED.nodes.getNode(config.server);
        var node = this;
        if (this.server) {

        } else {
            node.error("没有配置正确的gaode server", msg);
            return
        }
        let gaodeKey = this.server.gaodeKey

        node.on('input', function (msg) {

            var longitude = config.longitude || msg.payload.longitude
            var latitude = config.latitude || msg.payload.latitude
            var zoom = config.zoom || msg.payload.zoom || '10'
            let locations = `${longitude},${latitude}`
            var payload = {}
            var image_map = `https://restapi.amap.com/v3/staticmap?location=${locations}&zoom=${zoom}&size=750*500&markers=mid,,A:${locations}&key=${gaodeKey}`
            node.log(image_map)
            axios({
                method: 'get',
                url: `http://restapi.amap.com/v3/assistant/coordinate/convert?key=${gaodeKey}&locations=${locations}&coordsys=gps`


            }).then(function (response) {
                var data = response.data
                var status = data['status']
                image_map = `https://restapi.amap.com/v3/staticmap?location=${data.locations}&zoom=${zoom}&size=750*500&markers=mid,,A:${data.locations}&key=${gaodeKey}`
                node.log(image_map)
                if (status != 1) {
                    throw new Error(JSON.stringify(data))
                }

                return axios({
                    method: 'get',
                    url: `http://restapi.amap.com/v3/geocode/regeo?key=${gaodeKey}&location=${data.locations}&poitype=&radius=1000&extensions=all&batch=false&roadlevel=0`
                })
            }).then(function (response) {
                var data = response.data
                var status = data['status']
                if (status != 1) {
                    throw new Error(JSON.stringify(data))
                }

                payload.status = 1
                payload.location = data['regeocode']['formatted_address']
                payload.image = image_map
                msg.payload = payload
                msg['data'] = data
                node.send(msg)

            }).catch(function (error) {
                payload.status = 0
                payload = error.message
                msg.payload = payload
                msg['data'] = error
                node.send(msg)
            })

        });

    }
    RED.nodes.registerType("gaode", gaodeNode);



    function gaodeDirection(config) {
        RED.nodes.createNode(this, config);

        // Retrieve the config node
        this.server = RED.nodes.getNode(config.server);
        var node = this;
        if (this.server) {

        } else {
            node.error("没有配置正确的gaode server", msg);
            return
        }
        let gaodeKey = this.server.gaodeKey
        console.log(`key: ${gaodeKey}`)

        node.on('input', function (msg) {

            var longitude_source = config.longitude_source || msg.payload.longitude_source
            var latitude_source = config.latitude_source || msg.payload.latitude_source
            let locations_s = `${longitude_source},${latitude_source}`
            var longitude_direction = config.longitude_direction || msg.payload.longitude_direction
            var latitude_direction = config.latitude_direction || msg.payload.latitude_direction
            let locations_d = `${longitude_direction},${latitude_direction}`
            var city = config.city || msg.payload.city
            var payload = {}
            axios({
                method: 'get',
                url: `http://restapi.amap.com/v3/assistant/coordinate/convert?key=${gaodeKey}&locations=${locations_s}|${locations_d}&coordsys=gps`


            }).then(function (response) {
                var data = response.data
                var status = data['status']
                if (status != 1) {
                    throw new Error(JSON.stringify(data))
                }

                var locations = data.locations.split(';')
                var real_url = getRequestUrl(config, gaodeKey, locations, city)

                return axios({
                    method: 'get',
                    url: real_url
                })
            }).then(function (response) {
                var data = response.data
                if(config.s3){
                    var errcode = data['errcode']
                    if(errcode != 0){
                        throw new Error(JSON.stringify(data))                      
                    }
                }else{
                    var status = data['status']
                    if (status != 1) {
                        throw new Error(JSON.stringify(data))
                    }
                }

                var paths = null

                if(config.s2 || config.s1) {
                    paths = data['route']['paths'][0]
                }else if(config.s3) {
                    paths = data['data']['paths'][0]
                }else if (config.s4) {
                    paths = {}
                    paths['distance'] = data['route']['distance']
                    paths['duration' ]= data['route']['transits'][0]['duration']
                }

                payload.status = 1
                payload.distance = paths['distance']
                payload.duration = paths['duration']
                msg.payload = payload
                msg['data'] = data
                node.send(msg)

            }).catch(function (error) {
                payload.status = 0
                payload = error.message
                msg.payload = payload
                msg['data'] = error
                node.send(msg)
            })

        });

    }

    function getRequestUrl(config, gaodeKey, locaions,city) {
        if (config.s1) {
            return `https://restapi.amap.com/v3/direction/driving?origin=${locaions[0]}&destination=${locaions[1]}&key=${gaodeKey}`
        }

        if (config.s2) {
            return `https://restapi.amap.com/v3/direction/walking?origin=${locaions[0]}&destination=${locaions[1]}&key=${gaodeKey}`
        }

        if (config.s3) {
            return `https://restapi.amap.com/v4/direction/bicycling?origin=${locaions[0]}&destination=${locaions[1]}&key=${gaodeKey}`
        }

        if (config.s4) {
            return `https://restapi.amap.com/v3/direction/transit/integrated?origin=${locaions[0]}&destination=${locaions[1]}&key=${gaodeKey}&city=${city}&cityd=${city}`
        }
    }

    RED.nodes.registerType("gaode-direction", gaodeDirection);

    function RemoteServerNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.gaodeKey = n.gaodeKey;
    }
    RED.nodes.registerType("gaode-server", RemoteServerNode);

}
