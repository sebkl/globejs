/**
 * @constructor
 *
 * The given container may have the following attributes:
 *
 *  prefix - relative or absolute path to the globe location:
 *  			Example: <div id="container" prefix="globe/"/>
 *  			Which signals the globe to load textures from "globe/gen/" instead of "gen/"
 *
 */
GLOBE.TYPES.Globe = function(cid) {
    /* Helper function to convert a color object */
    function colorToVector(c) {
        return new THREE.Vector3(c.r, c.g, c.b);
    }

    /* Helper function to convert a color object */
    function colorToArrayColor(c) {
        return [c.r * 255, c.g * 255, c.b * 255];
    }

    /* Helper function to convert a color object */
    function arrayColorToColor(c) {
        return new THREE.Color(c[0] / 256, c[1] / 256, c[2] / 256);
    }

    /* Helper function to invert a color object */
    function invertColor(c) {
        if (Array.isArray(c)) {
            return [255 - c[0], 255 - c[1], 255 - c[2]];
        } else {
            return new THREE.Color(1.0 - c.r, 1.0 - c.g, 1.0 - c.b);
        }
    }

    /* Helper function to convert a color object 
     * params:	c - 8bit Color values [ 255,255,255 ]
     * 		i - normalized alpha value (0 - 1)
     * */
    function arrayColorToVector(c, i) {
        return new THREE.Vector4(c[0] / 256, c[1] / 256, c[2] / 256, i);
    }

    /* Helper function to convert a color object */
    function arrayColorToVector3(c) {
        return new THREE.Vector3(c[0] / 256, c[1] / 256, c[2] / 256);
    }

    function applyDatGuiControlConfiguration(gui) {
        var g = gui.addFolder('Globe');
        var p = g.addFolder('Particles');
        p.add(obj, 'particleSize', 1, 100);
        p.add(obj, 'particleLifetime', 1, 1000);
        p.addColor(obj, 'particleColor').onChange(function(value) {
            for (var i = 0; i < particle_count; i++) {
                arrayColorToVector(obj.particleColorFilter(value), 1.0).toArray(shaders.particle.attributes.color.value, i * 4);
            }
            //shaders.particle.attributes.needsUpdate = true;
        });

        var c = g.addFolder('Countries');
        c.add(obj, 'colorIntensity', 0, 1.0).onFinishChange(function(value) {
            shaders.earth.uniforms.cintensity.value = value;
            shaders.earth.uniforms.needsUpdate = true;
        });

        c.add(obj, 'borderIntensity', 0, 1.0).onFinishChange(function(value) {
            shaders.earth.uniforms.bintensity.value = value;
            shaders.earth.uniforms.needsUpdate = true;
        });

        c.addColor(obj, 'bColor').onChange(function(val) {
            obj.setBorderColor(arrayColorToColor(val));
        });

        c.addColor(obj, 'hoverColor').onChange(function(value) {
            obj.setCountryHoverColor(arrayColorToColor(value));
        });
        c.add(obj, 'clearCountryColors');

        var e = g.addFolder('Earth');
        e.addColor(obj, 'lightColor').onChange(function(val) {
            obj.setLightColor(arrayColorToColor(val));
        });
        e.addColor(obj, 'aColor').onChange(function(val) {
            obj.setAtmosphereColor(arrayColorToColor(val));
        });
        e.addColor(obj, 'bgColor').onChange(function(val) {
            obj.setBackgroundColor(arrayColorToColor(val));
        });
        obj.dayofyear = 1.0;
        e.add(obj, 'dayofyear', 1.0, 356.0).onFinishChange(function(value) {
            shaders.earth.uniforms.dayofyear.value = value;
            shaders.earth.uniforms.needsUpdate = true;
        });
        obj.hourofday = 0.0;
        e.add(obj, 'hourofday', 0.0, 24.0).onFinishChange(function(value) {
            shaders.earth.uniforms.hourofday.value = value;
            shaders.earth.uniforms.needsUpdate = true;
        });

        e.add(obj, 'disableDaylight');
        e.add(obj, 'enableDaylight');

        e.add(obj, 'stop');
        e.add(obj, 'start');
        e.add(obj, 'brightness', 0, 1.0).onFinishChange(function(value) {
            shaders.earth.uniforms.brightness.value = value;
            shaders.earth.uniforms.needsUpdate = true;
        });

        e.add(obj, 'colorization', 0, 1.0).onFinishChange(function(value) {
            shaders.earth.uniforms.color_intensity.value = value;
            shaders.earth.uniforms.needsUpdate = true;
        });

        e.add(obj, 'lightOn');
        e.add(obj, 'lightOut');
        e.add(obj, 'setBlackMode');
        e.add(obj, 'setWhiteMode');

        var t = g.addFolder('Pillars');
        t.add(obj, 'clearPillars');

        var l = g.addFolder('Lines');
        l.add(obj, 'clearConnections');
    }

    function unsetCountryColor(opco) {
        if (opco === undefined || opco == "ALL") {
            this.clearCountryColors();
        } else {
            this.setCountryColor(opco, new THREE.Color(0x000000));
        }
    }

    function setRotationSpeed(fac) {
        obj.rotSpeedFac = fac;
    }

    /*
     * params:  color - THREE.Color()
     * */
    function setBackgroundColor(color) {
        obj.bgColor = colorToArrayColor(color);
        renderer.setClearColor(color, 1);
        shaders.earth.uniforms.bgcolor.value = arrayColorToVector3(obj.bgColor);
        shaders.atmosphere.uniforms.bgcolor.value = arrayColorToVector3(obj.bgColor);
        shaders.earth.uniforms.needsUpdate = true;
        shaders.atmosphere.uniforms.needsUpdate = true;
    }

    function setCountryHoverColor(color) {
        obj.hoverColor = colorToArrayColor(color);
        shaders.earth.uniforms.selection.value = arrayColorToVector(obj.hoverColor, 0.4);
        shaders.earth.uniforms.needsUpdate = true;
    }

    /*
     * params:  color - THREE.Color()
     * */
    function setAtmosphereColor(color) {
        obj.aColor = colorToArrayColor(color);
        shaders.atmosphere.uniforms.acolor.value = arrayColorToVector3(obj.aColor);
        shaders.earth.uniforms.acolor.value = arrayColorToVector3(obj.aColor);
        shaders.atmosphere.uniforms.needsUpdate = true;
        shaders.earth.uniforms.needsUpdate = true;
    }

    /*
     * params:  color - THREE.Color()
     * */
    function setBorderColor(color) {
        obj.bColor = colorToArrayColor(color);
        shaders.earth.uniforms.bcolor.value = arrayColorToVector3(obj.bColor);
        shaders.earth.uniforms.needsUpdate = true;
    }

    function setBorderIntensity(v) {
        borderIntensity = v;
        shaders.earth.uniforms.bintensity.value = borderIntensity;
        shaders.earth.uniforms.needsUpdate = true;
    }

    function setColorIntensity(v) {
        shaders.earth.uniforms.color_intensity.value = v;
        shaders.earth.uniforms.needsUpdate = true;
    }

    function setCountryColorIntensity(v) {
        colorIntensity = v;
        shaders.earth.uniforms.cintensity.value = colorIntensity;
        shaders.earth.uniforms.needsUpdate = true;
    }

    function setWhiteMode() {
        obj.particleColorFilter = invertColor;
        obj.particleBlending = THREE.SubtractiveBlending;

        setBorderColor(COLOR_BLACK);
        setBackgroundColor(COLOR_WHITE);
        setAtmosphereColor(new THREE.Color(0xaaaaaa));
        setBorderIntensity(1.0);
        setColorIntensity(0.0);
        setCountryColorIntensity(1.0);
        setLightColor(new THREE.Color(0x555555));

        buildParticles();
        renderer.setClearColor(COLOR_WHITE, 1.0);
        renderer.clear();
    }

    function setBlackMode() {
        obj.particleColorFilter = function(d) {
            return d;
        };
        obj.particleBlending = THREE.AdditiveBlending;

        setBorderColor(COLOR_WHITE);
        setBackgroundColor(COLOR_BLACK);
        setAtmosphereColor(new THREE.Color(0x7f7fff));
        setBorderIntensity(DEFAULT_BORDER_INTENSITY);
        setColorIntensity(1.0);
        setCountryColorIntensity(DEFAULT_COLOR_INTENSITY);
        setLightColor(DEFAULT_LIGHT_COLOR);

        buildParticles();
        renderer.setClearColor(COLOR_BLACK, 1.0);
        renderer.clear();
    }

    /* Sets country color for list of iso codes:
     * params:	iso - array of iso codes [ 'DE','ES', ... ]
     * 		color - THREE.Color()
     * 		alpha - alpha value 0 - 1
     * 		index - country index id. Only used if iso code not et mapped.
     * */
    function setCountryColor(iso, color, alpha, index) {
        var ma;

        if (iso instanceof Array) {
            ma = iso;
        } else {
            ma = [iso];
        }

        if (index === undefined) {
            index = 0;
        }

        if (alpha === undefined) {
            alpha = 1.0;
        }

        var shader = shaders.earth.uniforms.countrydata.value;

        for (var x = 0; x < ma.length; x++) {
            try {
                var c = GLOBE.GEO.country_to_index(ma[x].toUpperCase());
                var o = index * 256;
                var i = c + o;
                shader.image.data[i * 4 + 0] = color.r * 255;
                shader.image.data[i * 4 + 1] = color.g * 255;
                shader.image.data[i * 4 + 2] = color.b * 255;
                shader.image.data[i * 4 + 3] = alpha * 255;
                _switchCountryColor(c);
            } catch (err) {
                console.log("Unknown country: " + ma[x] + ": " + err);
            }
        }
    }

    function immediateClearCountryColors() {
        var tex = createCountryDataTexture();
        shaders.earth.uniforms.countrydata.value = tex;
        shaders.earth.uniforms.needsUpdate = true;
    }

    function clearCountryColors() {
        var shader = shaders.earth.uniforms.countrydata.value;
        for (var i = 0; i < 256; i++) {
            shader.image.data[i * 4 + 0] = 0;
            shader.image.data[i * 4 + 1] = 0;
            shader.image.data[i * 4 + 2] = 0;
            shader.image.data[i * 4 + 3] = 0;
            _switchCountryColor(i);
        }
    }

    function _switchCountryColor(idx) {
        var map = shaders.earth.uniforms.countrydata.value;

        if (countryTweenMap[idx] !== undefined) {
            countryTweenMap[idx].stop();
            delete countryTweenMap[idx];
        }

        if (map.image.data[(256 + idx) * 4 + 0] == map.image.data[(idx) * 4 + 0] &&
            map.image.data[(256 + idx) * 4 + 1] == map.image.data[(idx) * 4 + 1] &&
            map.image.data[(256 + idx) * 4 + 2] == map.image.data[(idx) * 4 + 2] &&
            map.image.data[(256 + idx) * 4 + 3] == map.image.data[(idx) * 4 + 3]) {
            return;
        }

        var tween = new TWEEN.Tween({
                r: map.image.data[(256 + idx) * 4 + 0],
                g: map.image.data[(256 + idx) * 4 + 1],
                b: map.image.data[(256 + idx) * 4 + 2],
                a: map.image.data[(256 + idx) * 4 + 3]
            }).to({
                r: map.image.data[(idx) * 4 + 0],
                g: map.image.data[(idx) * 4 + 1],
                b: map.image.data[(idx) * 4 + 2],
                a: map.image.data[(idx) * 4 + 3]
            }, 500).onComplete(function() {
                delete countryTweenMap[idx];
            }).onUpdate(function() {
                map.image.data[(256 + idx) * 4 + 0] = this.r;
                map.image.data[(256 + idx) * 4 + 1] = this.g;
                map.image.data[(256 + idx) * 4 + 2] = this.b;
                map.image.data[(256 + idx) * 4 + 3] = this.a;
                map.needsUpdate = true;
            }).easing(TWEEN.Easing.Linear.EaseNone)
            .start();
        countryTweenMap[idx] = tween;
    }

    /* Create a raw datastructure in RGBA format) 
     * width	- Width of the texture
     * height	- height of the textzre
     * val		- Default value for each color channel. */
    function createDataTexture(width, height, val) {
        var depth = 4; // Depth for RGBA Format.
        var format = THREE.RGBAFormat;

        var size = width * height;
        var data = new Uint8Array(depth * size);

        for (var i = 0; i < size; i++) {
            for (var d = 0; d < depth; d++) {
                data[i * depth + d] = val;
            }
        }

        //var text = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, type, mapping, wrapS, wrapT, magFilter, minFilter, anisotropy )
        var text = new THREE.DataTexture(data, width, height, format);
        //THREE.UnsignedByteType  // has depth 1
        //THREE.RGBFormat // has depth 3
        //THREE.RGBAFormat // has depth 4
        //text.minFilter = THREE.NearestFilter; /* DEFAULT : THREE.LinearMipMapLinearFilter; */
        text.minFilter = THREE.NearestFilter;
        text.needsUpdate = true;
        return text;
    }

    function createGeoDataTexture(det) {
        if (det === undefined) {
            det = 1;
        }
        det = Math.round(det);

        var width = 360 * det;
        var height = 180 * det;
        var ret = createDataTexture(width, height, 0);

        return ret;
    }

    function clearGeoDataColor() {
        shaders.earth.uniforms.geodata.value = createGeoDataTexture();
        shaders.earth.uniforms.geodata.needsUpdate = true;
    }

    function setGeoDataTexture(tex) {
        shaders.earth.uniforms.geodata.value = tex;
        shader.needsUpdate = true;
    }

    function setGeoDataColor(lon, lat, col, alpha) {
        var shader = shaders.earth.uniforms.geodata.value;
        var longval = Math.round(shader.image.width * ((lon + 180) / 360));
        var latval = Math.round(shader.image.height * ((lat + 90) / 180));
        var i = (shader.image.width * latval) + longval;
        shader.image.data[i * 4 + 0] = col.r * 255;
        shader.image.data[i * 4 + 1] = col.g * 255;
        shader.image.data[i * 4 + 2] = col.b * 255;
        shader.image.data[i * 4 + 3] = alpha * 255;
        shader.needsUpdate = true;
    }

    function createCountryDataTexture() {
        return createDataTexture(256, 1, 0);
    }

    function calibrate_longitude(x) {
        x += 90;
        if (x > 180)
            x -= 360;
        return x;
    }

    function decalibrate_longitude(x) {
        x -= 90;
        return x;
    }

    function degree_to_radius_longitude(v) {
        return calibrate_longitude(v) * ((1 / 360.0) * 2 * Math.PI);
    }

    function degree_to_radius_latitude(v) {
        return -v * ((1 / 360.0) * 2 * Math.PI);
    }

    function radius_to_degree_longitude(v) {
        return (v / ((1 / 360.0) * 2 * Math.PI));
    }

    function radius_to_degree_latitude(v) {
        return -(v / ((1 / 360.0) * 2 * Math.PI));
    }

    function buildParticles() {
        particleScene = new THREE.Scene();
        var shader = shaders.particle;
        var longs = shader.attributes.longitude.value;
        var lats = shader.attributes.latitude.value;
        var destx = shader.attributes.longitude_d.value;
        var desty = shader.attributes.latitude_d.value;
        var lifetimes = shader.attributes.lifetime.value;
        var created = shader.attributes.created.value;
        var sizes = shader.attributes.size.value;
        var random = shader.attributes.random.value;
        var color = shader.attributes.color.value;
        var hf = shader.attributes.heightfactor.value;

        shader.uniforms.texture.value.wrapS = THREE.RepeatWrapping;
        shader.uniforms.texture.value.wrapT = THREE.RepeatWrapping;

        particles = new THREE.BufferGeometry();
        positions = new Float32Array(particle_count * 3);

        vertex = new THREE.Vector3(0.0, 0.0, 0.0);
        for (var i = 0; i < particle_count; i++) {
            vertex.toArray(positions, i * 3);

            longs[i] = degree_to_radius_longitude(0);
            lats[i] = degree_to_radius_latitude(0);
            created[i] = tic;
            destx[i] = degree_to_radius_longitude(0);
            desty[i] = degree_to_radius_latitude(0);
            lifetimes[i] = 0.0;
            sizes[i] = 0.0;
            random[i] = 0.5;
            arrayColorToVector(obj.particleColorFilter(obj.particleColor), obj.particleIntensity).toArray(color, i * 4);
            hf[i] = 1.0;
        }

        particles.addAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.addAttribute('longitude', new THREE.BufferAttribute(longs, 1));
        particles.addAttribute('latitude', new THREE.BufferAttribute(lats, 1));
        particles.addAttribute('longitude_d', new THREE.BufferAttribute(destx, 1));
        particles.addAttribute('latitude_d', new THREE.BufferAttribute(desty, 1));
        particles.addAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        particles.addAttribute('created', new THREE.BufferAttribute(created, 1));
        particles.addAttribute('size', new THREE.BufferAttribute(sizes, 1));
        particles.addAttribute('random', new THREE.BufferAttribute(random, 1));
        particles.addAttribute('color', new THREE.BufferAttribute(color, 4));
        particles.addAttribute('heightfactor', new THREE.BufferAttribute(hf, 1));
        particles.dynamic = true;

        var material = new THREE.ShaderMaterial({
            uniforms: shader.uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            //blending: obj.particleBlending,
            blending: THREE.AdditiveBlending, //DEBUG
            transparent: true,
            depthTest: true,
            //wireframe: true,
            depthWrite: false //Magic setting to make particles not clipping ;)
        });

        particleSystem = new THREE.Points(particles, material);

        particleSystem.dynamic = true;
        particleScene.add(particleSystem);
        console.log("Particles initialized:");
    }

    function createSourceParticle(x, y, c, hf) {
        createMoveParticle(x, y, x, y, c, hf);
    }

    function createCountrySourceParticle(source, hf) {
        createCountryMoveParticle(source, source, hf);
    }

    /* Create a particle that moves from country <from> to country <to>
     * from - ISO code of the source country
     * to - ISO code of the destination country
     * hf - height factor
     * */
    function createCountryMoveParticle(from, to, hf) {
        var from_co = GLOBE.GEO.lookup_geo_points(from);
        var to_co = GLOBE.GEO.lookup_geo_points(to);
        createMoveParticle(from_co[0], from_co[1], to_co[0], to_co[1], hf);
    }

    /* Create a particle that moves from (x,y) to (dx,dy)
     * x  - origin longitude
     * y  - origin latitude
     * dx - target longitude
     * dy - target latitude
     * c  - color of marticle in [ 255,255,255 ] color notation 
     * hf - height factor where 1 is standard height */
    function createMoveParticle(x, y, dx, dy, c, hf) {
        createParticle(x, y, dx, dy, obj.particleLifetime, obj.particleSize, c, hf);
    }

    function createParticle(x, y, dx, dy, lifetime, particleSize, c, hf) {
        if (particles !== undefined) {
            var attrib = particleSystem.geometry.attributes;
            var longs = attrib.longitude;
            var lats = attrib.latitude;
            var destx = attrib.longitude_d;
            var desty = attrib.latitude_d;
            var lifetimes = attrib.lifetime;
            var created = attrib.created;
            var sizes = attrib.size;
            var random = attrib.random;
            var color = attrib.color;
            var heightfactor = attrib.heightfactor;

            var i = particle_cursor;

            if ((tic - created[i]) < lifetimes[i]) {
                console.log("Particle buffer overflow ;)");
            }

            longs.array[i] = (degree_to_radius_longitude(x));
            lats.array[i] = (degree_to_radius_latitude(y));
            created.array[i] = (tic);
            destx.array[i] = (degree_to_radius_longitude(dx));
            desty.array[i] = (degree_to_radius_latitude(dy));
            lifetimes.array[i] = (lifetime);
            sizes.array[i] = particleSize;
            random.array[i] = Math.random();

            if (c !== undefined && c !== null) {
                //color[i] = arrayColorToVector(obj.particleColorFilter(c),obj.particleIntensity);
                arrayColorToVector(obj.particleColorFilter(c), obj.particleIntensity).toArray(color.array, i * 4);
                color.array[(i * 4) + 0] = 1.0;
                color.array[(i * 4) + 1] = 1.0;
                color.array[(i * 4) + 2] = 1.0;
                color.array[(i * 4) + 3] = 1.0;
            }

            if (hf !== undefined && hf !== null) {
                heightfactor.array[i] = hf;
            }

            /* tell three js to update attributes on GPU */
            color.needsUpdate = true;
            heightfactor.needsUpdate = true;
            longs.needsUpdate = true;
            lats.needsUpdate = true;
            destx.needsUpdate = true;
            desty.needsUpdate = true;
            created.needsUpdate = true;
            lifetimes.needsUpdate = true;
            sizes.needsUpdate = true;
            random.needsUpdate = true;
            heightfactor.needsUpdate = true;
            color.needsUpdate = true;
            particle_cursor++;

            /* make particles a ring-buffer */
            if (particle_cursor > particle_count) {
                particle_cursor = 0;
            }
        }
    }

    /* Lazy initialized hi-res spehere geometry. */
    function getSphereGeometryHiRes() {
        if (sphereGeometryHiRes === undefined) {
            sphereGeometryHiRes = new THREE.SphereGeometry(RADIUS, 80, 40);
        }

        return sphereGeometryHiRes;
    }

    /* Lazy initialized low-res spehere geometry. */
    function getSphereGeometryLowRes() {
        if (sphereGeometryLowRes === undefined) {
            sphereGeometryLowRes = new THREE.SphereGeometry(RADIUS, 40, 20);
        }
        return sphereGeometryLowRes;
    }

    /** Create the earth sphere object.  */
    function buildSphere() {
        var shader = shaders.earth;

        var texture = texloader.load(atlas_url);
        var countrymap = texloader.load(cmap_url);

        //texture.minFilter = THREE.NearestMipMapNearestFilter; /* DEFAULT : THREE.LinearMipMapLinearFilter; */
        countrymap.magFilter = THREE.NearestFilter; /* DEFAULT: THREE.LinearFilter;  */
        countrymap.minFilter = THREE.NearestFilter; /* DEFAULT : THREE.LinearMipMapLinearFilter; */

        shader.uniforms.texture.value = texture;
        shader.uniforms.countrymap.value = countrymap;

        var sphereMaterial = new THREE.ShaderMaterial({
            uniforms: shader.uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader
        });

        sphere = new THREE.Mesh(
            getSphereGeometryHiRes(),
            sphereMaterial
        );

        scene.add(sphere);
        console.log("GLOBE sphere initialized.");
    }

    /** Create the earth atmosphere object. */
    function buildAtmosphere() {
        atmosphereScene = new THREE.Scene();
        var shader = shaders.atmosphere;
        var atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: shader.uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            side: THREE.BackSide,
            transparent: true,
            opacity: 1.0

        });

        atmosphere = new THREE.Mesh(
            getSphereGeometryLowRes(),
            atmosphereMaterial
        );

        atmosphere.scale.x = atmosphere.scale.y = atmosphere.scale.z = ATMOSPHERE_SIZE_FACTOR;
        //scene.add(atmosphere);
        atmosphereScene.add(atmosphere);
        console.log("Atmosphere initialized");
    }

    /* Initialize geometry required by data pillars. */
    function buildDataPillars() {
        pillarGeometry = new THREE.CubeGeometry(1, 1, 1, 1, 1, 1, undefined, false, {
            px: true,
            nx: true,
            py: true,
            ny: true,
            pz: false,
            nz: true
        });
        for (var i = 0; i < pillarGeometry.vertices.length; i++) {
            var vertex = pillarGeometry.vertices[i];
            //vertex.position.z += 0.5;
            vertex.z += 0.5;
        }
        console.log("Data Pillars initialized.");
    }

    /* Add a data pillar at given geo-coordinates.
     *  lat - Latitude
     *  lng - Longitude
     *  factor - normalized size and color factor (0.0 - 1.0) 
     *  */
    function addDataPillar(lat, lng, factor) {
        return addPillar(lat, lng, factor, GLOBE.HELPER.factorToColor(factor).getHex());
    }

    /* Add a data pillar for a given country.
     *  iso -  country iso code.
     *  factor - normalized size and color factor (0.0 - 1.0)
     *  */
    function addCountryPillar(iso, factor) {
        var p;
        if (countryPillars[iso] !== undefined) {
            p = countryPillars[iso];
            changePillarFactor(p, factor);
        } else {
            var co = GLOBE.GEO.lookup_geo_points(iso);
            //console.log("" + iso + " (" + co[0] + "," + co[1] + ")");
            p = addDataPillar(co[0], co[1], factor);
            countryPillars[iso] = p;
        }
        return p;
    }

    /* Add a connection line netween two countries:
     *  from - iso country code of source country.
     *  to   - iso country code of destination country.
     *  intensity - thickness (1.0 is standard)
     *  */
    function connectCountry(from, to, intensity) {
        var f = GLOBE.GEO.lookup_geo_points(from);
        var t = GLOBE.GEO.lookup_geo_points(to);
        return connectPolar(f[0], f[1], t[0], t[1], intensity);
    }

    function connectPolar(x, y, dx, dy, intensity) {
        return createLine(x, y, dx, dy, intensity);
    }

    function addPolarConnections(data, i) {
        return createLines(data, i);
    }

    function createLine(geo_x, geo_y, geo_dx, geo_dy, intensity) {
        return createLines([
            [geo_x, geo_y, geo_dx, geo_dy]
        ], intensity);
    }

    function createLines(data, intensity) {
        var lineGeometry = new THREE.Geometry();
        var inte = intensity || 1.0;
        var idx;
        for (idx = 0; idx < data.length; idx++) {
            var l = data[idx];
            var geo_x = l[0];
            var geo_y = l[1];
            var geo_dx = l[2];
            var geo_dy = l[3];

            var from = new THREE.Vector3(degree_to_radius_longitude(geo_x), degree_to_radius_latitude(geo_y), RADIUS);
            var to = new THREE.Vector3(degree_to_radius_longitude(geo_dx), degree_to_radius_latitude(geo_dy), RADIUS);

            var lp = LINE_POINTS - 1;

            try {
                for (var i = 0; i <= lp; i++) {
                    var age = i / lp;
                    var v = new THREE.Vector3(0, 0, 0);
                    v.x = from.x * (1.0 - age) + to.x * age;
                    v.y = from.y * (1.0 - age) + to.y * age;
                    v.z = RADIUS + (Math.sin(age * Math.PI) * LINE_HFAC * RADIUS);
                    var t = convert_from_polar(v);
                    lineGeometry.vertices.push(t);
                }
            } catch (e) {
                console.log(" Adding line failed: " + e);
            }
        }

        var lineMaterial = new THREE.LineBasicMaterial({
            color: LINE_COLOR,
            opacity: inte,
            transparent: true,
            linewidth: 1
        });

        var line = new THREE.Line(lineGeometry, lineMaterial, THREE.LineStrip);
        line.position.x = 0;
        line.position.y = 0;
        line.position.z = 0;

        lines.push(line);
        scene.add(line);
        return line;
    }

    function removeConnection(con) {
        scene.remove(con);
    }

    function clearConnections() {
        for (var i = 0; i < lines.length; i++) {
            scene.remove(lines[i]);
        }
        lines = [];
    }

    function _pillarSize(fac) {
        return RADIUS + (fac * PILLAR_FULLSIZE);
    }

    function _setPillarData(factor) {
        var pillar = this;
        this.material.color = new THREE.Color(GLOBE.HELPER.factorToColor(factor).getHex());
        var tween = new TWEEN.Tween({
                z: pillar.scale.z
            })
            .to({
                z: _pillarSize(factor)
            }, 200)
            .easing(TWEEN.Easing.Linear.EaseNone)
            .onUpdate(function() {
                pillar.scale.z = this.z;
                pillar.needsUpdate = true;
            });
        tween.start();
    }

    function addPillar(lng, lat, size, color) {
        var pos = convert_from_polar(new THREE.Vector3(degree_to_radius_longitude(lng), degree_to_radius_latitude(lat), RADIUS));
        var pillar = new THREE.Mesh(pillarGeometry, new THREE.MeshBasicMaterial({
            color: color
        }));
        pillar.lookAt(pos);
        pillar.scale.z = _pillarSize(size);
        blendPillar(pillar, 0.0, 1.0);
        pillars.push(pillar);
        scene.add(pillar);
        pillar.setData = _setPillarData;
        return pillar;
    }

    function blendPillar(pillar, f_fac, t_fac, complete) {
        var tween = new TWEEN.Tween({
                x: pillar.scale.x * f_fac,
                y: pillar.scale.y * f_fac,
                z: pillar.scale.z * f_fac
            })
            .to({
                x: pillar.scale.x * t_fac,
                y: pillar.scale.y * t_fac,
                z: pillar.scale.z * t_fac


            }, 1000)
            .easing(TWEEN.Easing.Linear.EaseNone)
            .onUpdate(function() {
                pillar.scale.z = this.z;
                pillar.scale.x = this.x;
                pillar.scale.y = this.y;
                pillar.needsUpdate = true;
            });

        if (complete !== undefined) {
            tween = tween.onComplete(complete);
        }

        tween.start();
    }

    function lightOut() {
        changeColorMode(0.4, 0.0);
    }

    function lightOn() {
        changeColorMode(1.0, 1.0);
    }

    function changeColorMode(bn, ci) {
        var tween = new TWEEN.Tween({
                b: shaders.earth.uniforms.brightness.value,
                c: shaders.earth.uniforms.color_intensity.value
            }).to({
                b: bn,
                c: ci
            }, 500)
            .easing(TWEEN.Easing.Linear.EaseNone)
            .onUpdate(function() {
                shaders.earth.uniforms.brightness.value = this.b;
                shaders.earth.uniforms.color_intensity.value = this.c;
                shaders.earth.uniforms.needsUpdate = true;
            }).start();
    }

    function switchDataPillars(data) {
        clearPillars(function() {
            addDataPillars(data);
        });
    }

    /* Creates a static set of Pillars based on the data array. All pillars are created as a big geometry which improves rendering performance.
     * data array format : [ [long,lat,size_factor], [...], ... ]
     * These pillars can not be split up and following to that can only be removed from scene at once.
     * */
    function addDataPillars(data) {
        var max = 0;
        for (var i = 0; i < data.length; i++) {
            if (data[i][2] > max) {
                max = data[i][2];
            }
        }
        var pg = pillarGeometry;

        /* Mother geometry */
        var subgeo = new THREE.Geometry();
        var point = new THREE.Mesh(pg, THREE.MeshFaceMaterial());
        for (i = 0; i < data.length; i++) {
            var lng = data[i][0];
            var lat = data[i][1];
            var val = data[i][2] / max;
            var pos = convert_from_polar(new THREE.Vector3(degree_to_radius_longitude(lng), degree_to_radius_latitude(lat), RADIUS));
            var color = GLOBE.HELPER.factorToColor(val);
            var scale = _pillarSize(val);
            point.scale.z = scale;
            point.position = pos;
            for (var ii = 0; ii < point.geometry.faces.length; ii++) {
                point.geometry.faces[ii].color = color;
            }
            point.lookAt(scene.position);
            THREE.GeometryUtils.merge(subgeo, point);
        }

        var points = new THREE.Mesh(subgeo, new THREE.MeshBasicMaterial({
            color: 0xffffff,
            vertexColors: THREE.FaceColors
        }));

        blendPillar(points, 0.0, 1.0);
        pillars.push(points);
        scene.add(points);
        return points;
    }

    function changePillarFactor(pillar, factor) {
        pillar.material.color = GLOBE.HELPER.factorToColor(factor); // TODO: include this in animation.
        var tween = new TWEEN.Tween({
                x: pillar.scale.z
            })
            .to({
                x: _pillarSize(factor)
            }, 1000)
            .easing(TWEEN.Easing.Linear.EaseNone)
            .onUpdate(function() {
                pillar.scale.z = this.x;
                pillar.needsUpdate = true;

            })
            .start();
        return pillar;
    }

    function disableDaylight() {
        var disable = new THREE.Vector3(-1.0, -1.0, -1.0);
        shaders.earth.uniforms.lightcolor.value = disable;
        shaders.atmosphere.uniforms.lightcolor.value = disable;
        shaders.atmosphere.uniforms.needsUpdate = true;
        shaders.earth.uniforms.needsUpdate = true;
    }

    function enableDaylight() {
        shaders.earth.uniforms.lightcolor.value = arrayColorToVector3(obj.lightColor);
        shaders.atmosphere.uniforms.lightcolor.value = arrayColorToVector3(obj.lightColor);
        shaders.atmosphere.uniforms.needsUpdate = true;
        shaders.earth.uniforms.needsUpdate = true;
    }

    function isDaylightEnabled() {
        var disable = new THREE.Vector3(-1.0, -1.0, -1.0);
        return (shaders.earth.uniforms.lightcolor.value != disable);
    }

    function setLightColor(col) {
        obj.lightColor = colorToArrayColor(col);
        if (isDaylightEnabled()) {
            enableDaylight();
        }
    }

    function updateTime() {
        setTime(new Date());
    }

    function setTime(d) {
        if (d !== undefined && d !== null) {
            time = d;
            var h = d.getUTCHours() - 12.0;
            var doy = (GLOBE.HELPER.dayOfYear(d) - 1) - 180.0;

            if (h < 0) {
                h = 24.0 + h;
            }

            if (doy < 0) {
                doy = 356.0 + doy;
            }

            //shaders.earth.uniforms.hourofday.value = h;
            //shaders.earth.uniforms.dayofyear.value = doy + 1.0;
            shaders.earth.uniforms.needsUpdate = true;
            //TODO: Set light vector based on time
        } else {
            //shaders.earth.uniforms.hourofday.value = 0.0;
            //shaders.earth.uniforms.dayofyear.value = 0.0;
            shaders.earth.uniforms.needsUpdate = true;
            //TODO: Set light vector based on time
        }
    }

    /* Blend out/Remove all registered pillars. 
     * Objects will also be removed from scene after animation is complete.
     * */
    function clearPillars(callback) {
        var pil = pillars;
        pillars = [];
        for (var i = 0; i < pil.length; i++) {
            blendPillar(pil[i], 1.0, 0.0);
        }
        setTimeout(function() {
            for (var p = 0; p < pil.length; p++) {
                scene.remove(pil[p]);
            }
            if ((pil.length === 0) && (callback !== undefined)) {
                callback();
            }
        }, 1000);
    }

    function onMouseInContainer(e) {
        overRenderer = true;
        //container.addEventListener('mousedown', onMouseDown, true);
        $(containerId).bind('mousedown', undefined, onMouseDown);
    }

    function onMouseOutContainer(e) {
        updateHoverHandler(NO_COUNTRY);
        overRenderer = false;
        $(containerId).unbind('mousedown', onMouseDown);
    }

    function eventCountryHover(e, iso) {
        obj.setHoverCountry(iso);
    }

    function eventCountryUnhover(e) {
        obj.setHoverCountry('0');
    }

    /** Internally used gunction to deal with color set events for a country.
     * It assigns a user specified color to the given country. Event parameter is actually ignored. */
    function eventSetCountryColor(e, opco, col) {
        console.log("Setting color for country: " + opco);
        obj.setCountryColor(opco, col);
    }

    /* Internally used function to deal with color unset event for a country.
     * It removes the currently assigned color of the given country. Event parameter is actually ignored. */
    function eventUnsetCountryColor(e, opco) {
        obj.unsetCountryColor(opco);
    }

    function eventNavigationZoomIn(e) {
        zoom(ZOOM_CLICK_STEP);
    }

    function eventNavigationZoomOut(e) {
        zoom(-ZOOM_CLICK_STEP);
    }

    function eventCountryFocus(e, opco) {
        obj.moveToCountry(opco);
    }

    /** Add all relevant Event listeners */
    function addEventListeners() {
        console.log("Adding event Listener for 3D globe.");

        /* Set event handler for environment */
        $(document).bind('country:focus', eventCountryFocus);
        $(document).bind('country:hover', eventCountryHover);
        $(document).bind('country:unhover', eventCountryUnhover);

        /*Steup event Listeners. */
        window.addEventListener('resize', onWindowResize, false);
        $(containerId).bind('mousedown', undefined, onMouseDown);
        $(containerId).bind('mousewheel', undefined, onMouseWheel);
        $(containerId).bind('mousemove', undefined, onMouseBrowse);
        $(containerId).bind('mouseover', undefined, onMouseInContainer);
        $(containerId).bind('mouseout', undefined, onMouseOutContainer);

        $(document).bind('country:color:set', eventSetCountryColor);
        $(document).bind('country:color:unset', eventUnsetCountryColor);

        $(document).bind('navigation:zoom:in', eventNavigationZoomIn);
        $(document).bind('navigation:zoom:out', eventNavigationZoomOut);

		/* Listen on arrow-keys */
		$(document).bind('keydown', onKeyDown);
    }

    /** Remove all relevant Event listeners */
    function removeEventListeners() {
        window.removeEventListener('resize', onWindowResize, true);
        $(containerId).unbind('mousedown', onMouseDown);
        $(containerId).unbind('mousewheel', onMouseWheel);
        $(containerId).unbind('mousemove', onMouseBrowse);
        $(containerId).unbind('mouseover', onMouseInContainer);
        $(containerId).unbind('mouseout', onMouseOutContainer);

        $(document).unbind('country:focus', eventCountryFocus);
        $(document).unbind('country:hover', eventCountryHover);
        $(document).unbind('country:unhover', eventCountryUnhover);

        $(document).unbind('country:color:set', eventSetCountryColor);
        $(document).unbind('country:color:unset', eventUnsetCountryColor);

        $(document).unbind('navigation:zoom:in', eventNavigationZoomIn);
        $(document).unbind('navigation:zoom:out', eventNavigationZoomOut);

		$(document).unbind('keydown', onKeyDown);
    }

    function init() {
        scene = new THREE.Scene();
        //camera = new THREE.PerspectiveCamera( 45, width/height, 0.1, 10000);
        //camera = new THREE.PerspectiveCamera(30, width / height, 1, 10000);
        camera = new THREE.PerspectiveCamera(30, width / height, 1, 10000);
        renderer = new THREE.WebGLRenderer();
        renderer.setSize(width, height);
        //renderer.setClearColorHex(0x000000, 0.0);
        //renderer.setClearColor(0x000000, 0.0);
        renderer.setClearColor(arrayColorToColor(obj.bgColor), 1.0);
        renderer.autoClear = false;
        //renderer.setBlending(THREE.AdditiveBlending);

        scene.add(camera);
        camera.position.z = distance;

        //registerEventListener()

        $(containerId).append($(renderer.domElement));
        console.log("GLOBE initialized.");
    }

    function render() {
        zoom(0);
        rotation.x += (target.x - rotation.x) * 0.1 * obj.rotSpeedFac;
        rotation.y += (target.y - rotation.y) * 0.1 * obj.rotSpeedFac;
        distance += (obj.distanceTarget - distance) * 0.3;
        camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
        camera.position.y = distance * Math.sin(rotation.y);
        camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);

        camera.lookAt(scene.position);
        camera.updateProjectionMatrix();

        renderer.clear();
        renderer.render(scene, camera);
        renderer.render(atmosphereScene, camera);
        renderer.render(particleScene, camera);
    }

    function animate() {
        if (enabled) {
            requestAnimationFrame(animate);
            TWEEN.update();
            tic += 1;
            shaders.particle.uniforms.now.value = tic;
            shaders.particle.uniforms.randomu.value = Math.random();

            // Wait 50 frames before sending initialized event.
            if (tic == 50) {
                $(document).trigger('globe:initialized', []);
            }

            render();
        }
    }

    /* Zoom/Scale globe and atmosphere within given boundaries. 
     * This is called for every frame render. */
    function zoom(delta) {
        obj.distanceTarget -= delta;
        var min = RADIUS * 1.1;
        var max = RADIUS * 5;
        obj.distanceTarget = obj.distanceTarget > max ? max : obj.distanceTarget;
        obj.distanceTarget = obj.distanceTarget < min ? min : obj.distanceTarget;

        // scale atmosphere according to zoom level. This makes atmosphere more realistic in deep zoom mode.
        var scaleFactor = 1.0 - ((distance - min) / (max - min));
        atmosphere.scale.x = atmosphere.scale.y = atmosphere.scale.z = (ATMOSPHERE_SIZE_FACTOR + (scaleFactor * 0.05));
    }

    function onMouseDown(event) {
        /* Check whether mouse is over sphere. Only in this case the spehere should be rotatable */
        var intersects = getIntersects(event);
        if (intersects.length >= 1) {
            //event.preventDefault();
            $(containerId).bind('mousemove', undefined, onMouseMove);
            $(containerId).bind('mouseup', undefined, onMouseUp);
            $(containerId).bind('mouseout', undefined, onMouseOut);
            mouseOnDown.x = -event.clientX;
            mouseOnDown.y = event.clientY;
            mouseOnDown.country = hovered_cc;
            targetOnDown.x = target.x;
            targetOnDown.y = target.y;
            $(containerId).css('cursor', 'move');
        }
    }

    function convert_from_polar(polar) {
        var tmp = Math.cos(polar.y);
        var depth = polar.z;
        var ret = new THREE.Vector3(depth * tmp * Math.sin(polar.x), depth * Math.sin(polar.y), depth * tmp * Math.cos(polar.x));
        return ret;
    }

    function convert_to_polar(coord) {

        var x = Math.atan(coord.x / coord.z);
        var y = Math.atan((coord.y * Math.cos(x)) / coord.z);

        x = x * 180 / Math.PI;
        y = y * 180 / Math.PI;

        // var y = Math.asin(coord.y / RADIUS);
        //var x = Math.asin( ( coord.x/(RADIUS * Math.acos(y)) ) );
        //
        if (coord.z < 0) {
            x = x + 180;
        } else {
            y = -y;
        }

        x = x - 90;

        if (x > 180)
            x = x - 360;

        var ret = new THREE.Vector2(x, y);
        return ret;
    }

    function setHoverCountry(iso) {
        try {
            if (iso != hovered_cc) {
                hovered_cc = iso;
                var geo = GLOBE.GEO.lookup_geo_points(iso);
                geo[0] = (geo[0] + 180) / 360;
                geo[1] = (geo[1] + 90) / 180;

                shaders.earth.uniforms.mousex.value = geo[0];
                shaders.earth.uniforms.mousey.value = geo[1];
            }
        } catch (err) {

        }
    }

    function updatePolarCoordinates(vec) {
        var cc = GLOBE.GEO.lookup_country(vec.x, vec.y);

        var v = new THREE.Vector2((vec.x + 180) / 360, (vec.y + 90) / 180);
        $(document).trigger('polar:hover', [Math.round(vec.x * 10) / 10, Math.round(vec.y * 10) / 10]);

        updateHoverHandler(cc);

        shaders.earth.uniforms.mousex.value = v.x;
        shaders.earth.uniforms.mousey.value = v.y;
    }

    function updateHoverHandler(cc) {
        if (cc != hovered_cc) {
            hovered_cc = cc;

            if (cc == NO_COUNTRY) {
                shaders.earth.uniforms.mousex.value = 0;
                shaders.earth.uniforms.mousey.value = 0;
                cc = null;
            }

            if (isNaN(cc) || cc === null) {
                $(document).trigger('country:hover', cc);
            } else {
                console.warn("Please map country id: " + cc);
            }
        }
    }

    function getHoveredCountry() {
        return hovered_cc;
    }

    function getIntersects(event) {
        event.preventDefault();
        var vector = new THREE.Vector3((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5);
        var ray = new THREE.Raycaster();
        ray.setFromCamera(vector, camera);
        var intersects = ray.intersectObjects([sphere]);
        return intersects;
    }

	function onKeyDown(event) {
		var delta = 0.7 * distance / 1000;
		switch (event.which) {
			case 39: /* right */
				target.x = target.x + delta;
				break;
			case 37: /* left */
				target.x = target.x - delta;
				break;
			case 38: /* up */
				target.y = target.y - delta;
				break;
			case 40: /* down */
				target.y = target.y + delta;
				break;
			default:
				console.log("KeyPResssed: " + event.which);
		}
        target.y = target.y > PI_HALF ? PI_HALF : target.y;
        target.y = target.y < -PI_HALF ? -PI_HALF : target.y;
	}

    function onMouseBrowse(event) {
        if (overRenderer) {
            if (lightMode.current == lightMode.MOUSE) {
                /* Set light vector based on mouse position. Mouse emits light. */
                var lightv = new THREE.Vector3((event.clientX * 2.0 / window.innerWidth) - 1.0, (event.clientY * -2.0 / window.innerHeight) + 1.0, 1.0);
                shaders.earth.uniforms.lightvector.value = lightv;
                shaders.atmosphere.uniforms.lightvector.value = lightv;
            }

            /* Set polar coordinates of mouse pointer. */
            var intersects = getIntersects(event);
            if (intersects.length == 1) {
                overGlobe = true;
                var i = 0;
                var vec = new THREE.Vector3(intersects[i].point.x, intersects[i].point.y, intersects[i].point.z);
                mouse_polar = convert_to_polar(vec);
                updatePolarCoordinates(mouse_polar);
                if (mouseMoveHandler !== undefined) {
                    mouseMoveHandler(event);
                }
            } else {
                if (overGlobe) {
                    overGlobe = false;
                    updateHoverHandler(NO_COUNTRY);
                    if (mouseMoveHandler !== undefined) {
                        mouseMoveHandler(undefined);
                    }
                }
            }
        }
    }

    function moveToCountry(iso) {
        var po = GLOBE.GEO.lookup_geo_points(iso);
        return moveToPolar(po[0], po[1]);
    }

    function moveToPolar(lon, lat) {
        console.log("Moving to " + lon + "," + lat);
        var camt = convert_from_polar(new THREE.Vector3(degree_to_radius_longitude(lon), degree_to_radius_latitude(lat), RADIUS * 2));

        target.x = degree_to_radius_longitude(lon);
        target.y = degree_to_radius_latitude(lat);

        camera.position = camt;
        camera.lookAt(scene.position);
        return [target.x, target.y];
    }

    function getCamTargetPos() {
        return [target.x, target.y];
    }

    function setCamTargetPos(x, y) {
        target.x = x;
        target.y = y;
    }

    function onMouseMove(event) {
        mouse.x = -event.clientX;
        mouse.y = event.clientY;
        var zoomDamp = distance / 1000;
        target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
        target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;
        target.y = target.y > PI_HALF ? PI_HALF : target.y;
        target.y = target.y < -PI_HALF ? -PI_HALF : target.y;
    }

    function onMouseUp(event) {
        $(containerId).unbind('mousemove', onMouseMove);
        $(containerId).unbind('mouseup', onMouseUp);
        $(containerId).unbind('mouseout', onMouseOut);
        container.style.cursor = 'auto';
        //createSourceParticle(mouse_polar.x,mouse_polar.y);
        //console.log(mouse_polar.x + " " + mouse_polar.y);
        if (hovered_cc == mouseOnDown.country) {
            $(document).trigger('country:click', hovered_cc);
        }
    }

    function onMouseOut(event) {
        $(containerId).unbind('mousemove', onMouseMove);
        $(containerId).unbind('mouseup', onMouseUp);
        $(containerId).unbind('mouseout', onMouseOut);
    }

    function onMouseWheel(event) {
        //event.preventDefault();
        //console.log("Mouse Wheel " + event);
        if (overRenderer) {
            zoom(event.originalEvent.wheelDeltaY * 0.3);
        }
        return false;
    }

    //TODO: Change to size of container.
    function onWindowResize(event) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function stop() {
        enabled = false;
        removeEventListeners();
        renderer.clear();
    }

    function start() {
        enabled = true;
        addEventListeners();
        animate();
    }

    function getContainerId() {
        return obj.containerId;
    }

    function setMouseMoveHandler(f) {
        mouseMoveHandler = f;
    }

    function setParticleSize(size) {
        obj.particleSize = size;
    }

    try {
        var obj = {};
        /* container variables */
        var containerId = cid;
        var polar_container;

        /* screen geometry */
        var width = $(containerId).width() - 5;
        var height = $(containerId).height() - 5;
        $("body").css("overflow", "hidden");
        if (width < 100 || height < 100) {
            console.log("WARNING: Very small area to display globe. Please adjust container size (Width: " + width + " Height: " + height + ")");
        }

        /* Constant and defaults values, which are fix */
        var PI_HALF = Math.PI / 2;
        var RADIUS = 200;
        var ATMOSPHERE_SIZE_FACTOR = 1.11;
        var ZOOM_SPEED = 0.25 * RADIUS;
        var ZOOM_CLICK_STEP = ZOOM_SPEED * 2;
        var PILLAR_FULLSIZE = 0.5 * RADIUS;
        var NO_COUNTRY = GLOBE.GEO.NO_COUNTRY;
        var COLOR_BLACK = new THREE.Color(0x000000);
        var COLOR_WHITE = new THREE.Color(0xffffff);
        var LINE_POINTS = 50; /* Amount of points used per line curve. */
        var LINE_HFAC = 0.2; /* Percentage of RADIUS the line curve will be heigh. */
        var LINE_COLOR = 0x8888ff;
        var MIN_PILLAR_SIZE = 0.2;
        /* (x,y,z):
         *  x => -1 .. 1 (left to right)
         *  y => -1 .. 1 (bottom to top)
         *  z => -1 .. 1 (back to front) */
        var DEFAULT_LIGHT_VECTOR = new THREE.Vector3(-0.5, 0.0, 1.0); // front bottom (slight left)
        var DEFAULT_LIGHT_COLOR = [255, 255, 128]; //new THREE.Color(0xffffff);
        var DEFAULT_BORDER_INTENSITY = 0.4;
        var DEFAULT_COLOR_INTENSITY = 0.6;

        /* time */
        var time = new Date();

        /* country map */
        var countryTweenMap = {};

        /* texture URLs */
        obj.prefix = $(cid).attr('prefix');
        if (!obj.prefix) {
            obj.prefix = "";
        }
        var atlas_url = obj.prefix + 'gen/atlas.png';
        var cmap_url = obj.prefix + 'gen/cmap.png';
        var texloader = new THREE.TextureLoader();

        /* Camera moving : */
        var vector = THREE.Vector3();
        var mouse = {
            x: 0,
            y: 0
        };
        var mouseOnDown = {
            x: 0,
            y: 0,
            country: 0
        };
        var rotation = {
            x: 0,
            y: 0
        };
        var target = {
            x: Math.PI * 3 / 2,
            y: Math.PI / 6.0
        };
        var targetOnDown = {
            x: 0,
            y: 0
        };
        var distance = 100000;
        obj.distanceTarget = 100000;
        var tic = 0;
        var mouse_polar;
        var hovered_cc; /* country iso code that is currently hovered by the nouse . */
        var mouseMoveHandler = undefined; /* for documentation purposes */

        /* particle settings */
        var particles; /* Particle geometry. */
        var particle_count = 10000;
        var particle_cursor = 0;
        obj.particleSize = 20; /* DAT-GUI */
        obj.particleLifetime = 200; /* DAT-GUI */
        obj.particleColor = [128, 255, 128]; /* DAT-GUI */
        obj.particleIntensity = 1.0;
        obj.particleBlending = THREE.AdditiveBlending;
        obj.particleColorFilter = function(x) {
            return x;
        };

        /* Light and color settings */
        obj.brightness = 1.0; /* DAT_GUI earth uniform */
        obj.colorization = 1.0; /* DAT_GUI earth uniform */
        obj.hoverColor = [255, 128, 128]; /* DAT-GUI */
        obj.colorIntensity = DEFAULT_COLOR_INTENSITY; /* DAT-GUI */
        obj.borderIntensity = DEFAULT_BORDER_INTENSITY; /* DAT_GUI */
        obj.bgColor = [0, 0, 0]; //new THREE.Color(0x000000);
        obj.bColor = [255, 255, 255]; //new THREE.Color(0xffffff);
        obj.aColor = [128, 128, 255]; //new THREE.Color(0x7f7fff);
        obj.lightColor = DEFAULT_LIGHT_COLOR; /* City light color */
        var lightMode = {
            "MOUSE": 0,
            "DEFAULT": 1,
            "TIME": 2,
            "DAY": 2,
            "current": 0
        };

        obj.rotSpeedFac = 1.0;

        /* Variable display objects */
        var pillars = [];
        var countryPillars = {};
        var lines = []; /* Lines for country/polar connections */

        /* Geometries 3D Base objects*/
        var shaders = {};
        var scene;
        var atmosphereScene;
        var particleScene;
        var camera;
        var renderer;
        var sphere;
        var particleSystem;
        var pillarGeometry;
        var sphereGeometryHiRes;
        var sphereGeometryLowRes;
        var atmosphere;

        var enabled = false; /* is globe enabled ? */
        var overGlobe = false; /* is mouse over globe */
        var overRenderer = true; /* is mouse over renderer */

        shaders = {
            'earth': {
                uniforms: {
                    'texture': {
                        type: 't',
                        value: undefined
                    },
                    'countrymap': {
                        type: 't',
                        value: undefined
                    },
                    'color_intensity': {
                        type: 'f',
                        value: 1.0
                    },
                    'brightness': {
                        type: 'f',
                        value: 1.0
                    },
                    'mousex': {
                        type: 'f',
                        value: 0
                    },
                    'mousey': {
                        type: 'f',
                        value: 0
                    },
                    "countrydata": {
                        type: "t",
                        value: createCountryDataTexture()
                    },
                    "geodata": {
                        type: "t",
                        value: createGeoDataTexture()
                    },
                    "selection": {
                        type: "v4",
                        value: arrayColorToVector(obj.hoverColor, obj.colorIntensity)
                    },
                    "cintensity": {
                        type: "f",
                        value: obj.colorIntensity
                    },
                    "bintensity": {
                        type: "f",
                        value: obj.borderIntensity
                    },
                    "bcolor": {
                        type: "v3",
                        value: arrayColorToVector3(obj.bColor)
                    },
                    "heightfactor": {
                        type: "f",
                        value: 1.0
                    },
                    "calpha": {
                        type: "f",
                        value: 1.0
                    },
                    "lightvector": {
                        type: "v3",
                        value: DEFAULT_LIGHT_VECTOR
                    },
                    "lightcolor": {
                        type: "v3",
                        value: arrayColorToVector3(obj.lightColor)
                    },
                    "bgcolor": {
                        type: "v3",
                        value: arrayColorToVector3(obj.bgColor)
                    },
                    "acolor": {
                        type: "v3",
                        value: arrayColorToVector3(obj.aColor)
                    }

                },
                vertexShader: [
                    'varying vec3 vNormal;',
                    'varying vec2 vUv;',
                    'uniform sampler2D texture;',
                    'uniform float heightfactor;',
                    'void main() {',
                    //'float hf = 1.0 - texture2D(texture,vec2(uv.x,(uv.y/2.0))).w;',
                    'float hf = texture2D(texture,vec2(uv.x,(uv.y/2.0))).w;',
                    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 - (hf*0.06*heightfactor) );',
                    'vNormal = normalize( normalMatrix * normal );',
                    'vUv = uv;',
                    '}'
                ].join('\n'),
                fragmentShader: [
                    'uniform sampler2D texture;',
                    'uniform sampler2D countrymap;',
                    'uniform float brightness;',
                    'uniform float color_intensity;',
                    'uniform float mousex;',
                    'uniform float mousey;',
                    'uniform sampler2D countrydata;',
                    'uniform sampler2D geodata;',
                    'uniform float cintensity;',
                    'uniform float calpha;', //TODO: not used anymore ?
                    'uniform vec4 selection;', //Color to use for a hovered country
                    'uniform float bintensity;',
                    'uniform vec3 lightvector;',
                    'uniform vec3 lightcolor;',
                    'uniform vec3 bgcolor;',
                    'uniform vec3 bcolor;',
                    'uniform vec3 acolor;',
                    'varying vec3 vNormal;',
                    'varying vec2 vUv;',

                    //Smoothly compute countries hovered color (borders smoothed)
                    'float avgcol(float tv) {',
                    'float ret = 0.0;',
                    'int count = 0;',
                    'for (int x = -3; x < 4; x++) {',
                    'for(int y = -3; y < 4; y++) {',
                    'count++;',
                    'ret += ((texture2D(countrymap,vUv + vec2(float(x)/float(2000),float(y)/float(1000))).x == tv) ? 1.0 : 0.0 );',
                    '}',
                    '}',
                    'ret*= 1.0/float(count);',
                    'return ret;',
                    '}',

                    'void main() {',
                    'vec2 pos = vec2(mousex, (1.0-mousey));',
                    'vec2 vUv1 = vec2(vUv.x,(vUv.y/2.0) + 0.5);',
                    'vec2 vUv2 = vec2(vUv.x,(vUv.y/2.0));',
                    'vec4 ccol = vec4(0.0,0.0,0.0,0.0);',

                    //Check if country is hovered by mouse
                    'if (texture2D(countrymap,pos).x > 0.0 && texture2D(countrymap,pos).x == texture2D(countrymap,vUv).x) {',

                    //Apply smoothed color based on actual texture and highlight color (selection)
                    'ccol = vec4(selection.xyz,calpha*selection.w);',
                    'ccol*=avgcol(texture2D(countrymap,pos).x);',

                    '} else {',

                    //Check if country has a datacolor.
                    'float par = 256.0;',
                    'int cidx = int(texture2D(countrymap,vUv).x * par);',
                    'float cc = float(cidx) / par;',
                    'if (cc > 0.0) {',

                    //Set the country Color from the countrydata texture.
                    'vec2 datapos = vec2(cc,0.0);',
                    'vec4 col = texture2D(countrydata,datapos);',
                    'ccol = vec4(col.xyz,calpha*col.w*cintensity);',
                    '}',
                    '}',

                    //Compute color for cities.
                    'vec3 city_col = lightcolor;',
                    'float city_fac = 0.0;',
                    'float day_factor = 1.0;',
                    'if (lightcolor.x >= 0.0 && lightcolor.y >= 0.0 && lightcolor.z >= 0.0) {',
                    'vec3 lightv= normalize(lightvector);',
                    'day_factor = max(0.0,dot(vNormal, lightv));',
                    'if (day_factor < 5.0) {',
                    'city_fac = texture2D(texture,vUv2).z * (2.0 - (day_factor * 2.0));',
                    '}',
                    '}',

                    /* Colorization (light and dark)*/
                    'float intensity = 1.15 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
                    'vec4 diffuse = texture2D( texture, vUv1 );',
                    'float col_int = color_intensity * (day_factor);',
                    'if (col_int < 1.0) {;',
                    'float ci = (1.0 - col_int);',
                    'float avgcv = (diffuse.x + diffuse.y + diffuse.z) / 3.0;',
                    'float xa = (diffuse.x - avgcv)*ci;',
                    'float ya = (diffuse.y - avgcv)*ci;',
                    'float za = (diffuse.z - avgcv)*ci;',
                    'diffuse = vec4(diffuse.x - xa,diffuse.y - ya, diffuse.z - za,diffuse.a);',
                    '}',

                    //Background color
                    'diffuse = vec4(mix(diffuse.xyz,bgcolor,1.0 - diffuse.a),diffuse.a);',
                    'diffuse = vec4(mix(diffuse.xyz,bgcolor,1.0 - day_factor),diffuse.a);',

                    //Compute geodata color
                    'vec4 geo = texture2D(geodata,vUv);',
                    'diffuse = vec4(mix(diffuse.xyz,geo.xyz,geo.a),diffuse.a);', /* geocolor */

                    'if (ccol.w > 0.0) {',
                    'diffuse = vec4(mix(diffuse.xyz,ccol.xyz,ccol.w),diffuse.a);', /* Country Color */
                    '}',

                    //Border Color
                    'diffuse = vec4(mix(diffuse.xyz,bcolor,(texture2D(texture,vUv2).y * bintensity)),1.0);', /* Border Color */

                    // City Color
                    'diffuse = vec4(mix(diffuse.xyz,city_col,city_fac),diffuse.a);', /* City Color */

                    //Atmosphere
                    'vec3 atmosphere = mix(diffuse.xyz,acolor,pow( intensity, 3.0 ));', /* atmosphere */
                    'diffuse = vec4(mix(diffuse.xyz,atmosphere,day_factor),diffuse.a);', /* atmosphere */

                    //Get it out
                    'gl_FragColor = (diffuse.a * brightness) * diffuse;',
                    '}'
                ].join('\n')
            },
            'atmosphere': {
                uniforms: {
                    "lightvector": {
                        type: "v3",
                        value: DEFAULT_LIGHT_VECTOR
                    },
                    "lightcolor": {
                        type: "v3",
                        value: DEFAULT_LIGHT_COLOR
                    },
                    "bgcolor": {
                        type: "v3",
                        value: arrayColorToVector3(obj.bgColor)
                    },
                    "acolor": {
                        type: "v3",
                        value: arrayColorToVector3(obj.aColor)
                    }

                },
                vertexShader: [
                    'varying vec3 vNormal;',
                    'void main() {',
                    'vNormal = normalize( normalMatrix * normal );',
                    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
                    '}'
                ].join('\n'),
                fragmentShader: [
                    'varying vec3 vNormal;',
                    'uniform vec3 lightvector;',
                    'uniform vec3 lightcolor;',
                    'uniform vec3 bgcolor;',
                    'uniform vec3 acolor;',
                    'void main() {',
                    'vec3  lightv= normalize(lightvector);',
                    'float day_factor = dot(vNormal, lightv)+0.5;',
                    'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
                    'if (lightcolor.x < 0.0 || lightcolor.y < 0.0 || lightcolor.z < 0.0) {',
                    'day_factor = 1.0;',
                    '}',
                    'vec3 targetcol = mix(acolor,bgcolor,1.0 - (day_factor * 1.2 * intensity));',
                    'gl_FragColor = vec4(targetcol, intensity );',
                    '}'
                ].join('\n')
            },
            'particle': {
                uniforms: {
                    now: {
                        type: 'f',
                        value: 0
                    },
                    hitstart: {
                        type: 'f',
                        value: RADIUS
                    },
                    hitend: {
                        type: 'f',
                        value: RADIUS / 10
                    },
                    texture: {
                        type: 't',
                        value: texloader.load(obj.prefix + 'img/particle.png')
                    },
                    randomu: {
                        type: 'f',
                        value: 0.5
                    }
                },
                attributes: {
                    longitude: {
                        type: 'f',
                        value: new Float32Array(particle_count)
                    },
                    latitude: {
                        type: 'f',
                        value: new Float32Array(particle_count)
                    },
                    longitude_d: {
                        type: 'f',
                        value: new Float32Array(particle_count)
                    },
                    latitude_d: {
                        type: 'f',
                        value: new Float32Array(particle_count)
                    },
                    created: {
                        type: 'f',
                        value: new Float32Array(particle_count)
                    },
                    lifetime: {
                        type: 'f',
                        value: new Float32Array(particle_count)
                    },
                    color: {
                        type: 'v4',
                        value: new Float32Array(particle_count * 4)
                    },
                    size: {
                        type: 'f',
                        value: new Float32Array(particle_count)
                    },
                    heightfactor: {
                        type: 'f',
                        value: new Float32Array(particle_count)
                    },
                    random: {
                        type: "f",
                        value: new Float32Array(particle_count)
                    }

                },
                vertexShader: [
                    /* Using varying vNormal here would break the globe working on fu***ng Windows with the following errors:
                     *
                     * WebGL: INVALID_OPERATION: vertexAttribPointer: no bound ARRAY_BUFFER 
                     * WebGL: INVALID_OPERATION: drawArrays: attribs not setup correctly
                     *
                     * */
                    'uniform sampler2D texture;',
                    'uniform float now;',
                    'uniform float hitstart;',
                    'uniform float hitend;',
                    'uniform float randomu;',

                    'attribute float longitude;',
                    'attribute float latitude;',

                    'attribute float longitude_d;',
                    'attribute float latitude_d;',

                    'attribute float created;',
                    'attribute float lifetime;',

                    'attribute float heightfactor;',
                    'attribute float size;',
                    'attribute float random;',

                    'attribute vec4 color;',
                    'varying vec4 col;',

                    'varying float age;',
                    //'varying vec2 vUv;',
                    'vec4 convert_from_polar(vec3 coord)',
                    '{',
                    'float tmp = cos(coord.y);',
                    'vec4 res = vec4(tmp * sin(coord.x), sin(coord.y), tmp * cos(coord.x), 0.0) * coord.z;',
                    'res.w = 1.0;',
                    'return res;',
                    '}',

                    'void main() {',
                    'age = ((max(now-created,0.0) / (lifetime + random * lifetime * 0.3)));',
                    'col = color;',
                    'if ( age <= 1.0 ) {',
                    'vec2 way = vec2( (longitude*(1.0-age) + longitude_d*age), (latitude*(1.0-age) + latitude_d*age));',
                    'float dage = age * 2.0;',
                    'if (dage > 1.0) { dage = 2.0 - dage; }',
                    'vec4 coord = convert_from_polar(vec3(way,heightfactor * sin(age*3.142) * (hitend)  + hitstart));',

                    'gl_PointSize =(0.5 + dage *0.5) * size * (1.0 + (random - 0.5)* 3.0  * (randomu)) ;',
                    'gl_Position = projectionMatrix * modelViewMatrix * coord;',
                    '} else {',
                    'gl_PointSize = 0.0;',
                    'gl_Position = projectionMatrix * modelViewMatrix * vec4(0.0,0.0,0.0,1.0);',
                    '}',
                    '}'

                ].join('\n'),
                fragmentShader: [
                    'uniform sampler2D texture;',
                    'varying float age;',
                    'varying vec4 col;',
                    'uniform float v;',
                    //'varying vec2 vUv;',
                    'void main() {',

                    'float dage = age * 2.0;',
                    'if (dage > 1.0) { dage = 2.0 - dage; }',
                    //'float d = texture2D( texture, gl_PointCoord ).a;',
                    //'gl_FragColor = vec4(d * color.xyz,color.w - (dage*0.5));',

                    'float d = texture2D( texture, gl_PointCoord ).w ;',
                    //'float d = 1.0;',
                    //
                    //"vec2 vUv = gl_PointCoord;",
                    //"float d = 0.0;",

                    //"d += texture2D( texture, vec2( vUv.x, vUv.y - 4.0 * v ) ).r * 0.051;",
                    //"d += texture2D( texture, vec2( vUv.x, vUv.y - 3.0 * v ) ).r * 0.0918;",
                    //"d += texture2D( texture, vec2( vUv.x, vUv.y - 2.0 * v ) ).r * 0.12245;",
                    //"d += texture2D( texture, vec2( vUv.x, vUv.y - 1.0 * v ) ).r * 0.1531;",
                    //"d += texture2D( texture, vec2( vUv.x, vUv.y ) ).r * 0.1633;",
                    //"d += texture2D( texture, vec2( vUv.x, vUv.y + 1.0 * v ) ).r * 0.1531;",
                    //"d += texture2D( texture, vec2( vUv.x, vUv.y + 2.0 * v ) ).r * 0.12245;",
                    //"d += texture2D( texture, vec2( vUv.x, vUv.y + 3.0 * v ) ).r * 0.0918;",
                    //"d += texture2D( texture, vec2( vUv.x, vUv.y + 4.0 * v ) ).r * 0.051;",
                    'gl_FragColor = vec4(dage * d * d * col.xyz,d);',
                    //'gl_FragColor = vec4(dage * d * d * col.xyz,0.5);', //DEBUG
                    //'gl_FragColor = vec4(dage * d * d * vec3(1.0,1.0,1.0),0.5);', //DEBUG
                    //'gl_FragColor = vec4(1.0,1.0,1.0,0.5);', //DEBUG

                    '}'
                ].join('\n')
            }
        };

        /* Plug all together */
        init();
        buildParticles();
        buildSphere();
        buildAtmosphere();
        buildDataPillars();

        /* MAP API */
        obj.createSourceParticle = createSourceParticle;
        obj.createMoveParticle = createMoveParticle;
        obj.createCountryMoveParticle = createCountryMoveParticle;
        obj.createCountrySourceParticle = createCountrySourceParticle;

        obj.setMouseMoveHandler = setMouseMoveHandler;
        obj.setBackgroundColor = setBackgroundColor;
        obj.setBorderColor = setBorderColor;
        obj.setAtmosphereColor = setAtmosphereColor;
        obj.setLightColor = setLightColor;
        obj.setWhiteMode = setWhiteMode;
        obj.setBlackMode = setBlackMode;
        obj.setCountryColorIntensity = setCountryColorIntensity;
        obj.setColorIntensity = setColorIntensity;
        obj.setBorderIntensity = setBorderIntensity;
        obj.clearPillars = clearPillars;
        obj.switchDataPillars = switchDataPillars;
        obj.addPillar = addPillar;
        obj.addDataPillars = addDataPillars;
        obj.addDataPillar = addDataPillar;
        obj.addCountryPillar = addCountryPillar;
        obj.moveToCountry = moveToCountry;
        obj.moveToPolar = moveToPolar;
        obj.setCountryColor = setCountryColor;
        obj.unsetCountryColor = unsetCountryColor;
        obj.clearCountryColors = clearCountryColors;
        obj.immediateClearCountryColors = immediateClearCountryColors;
        obj.applyDatGuiControlConfiguration = applyDatGuiControlConfiguration;
        obj.switchCountryColorSet = setCountryColor;
        obj.setHoverCountry = setHoverCountry;
        obj.setCountryHoverColor = setCountryHoverColor;
        obj.stop = stop;
        obj.start = start;
        obj.isEnabled = function() {
            return enabled;
        };
        obj.getContainerId = getContainerId;
        obj.connectCountry = connectCountry;
        obj.connectPolar = connectPolar;
        obj.addPolarConnections = addPolarConnections;
        obj.clearConnections = clearConnections;
        obj.removeConnection = removeConnection;
        obj.lightOut = lightOut;
        obj.lightOn = lightOn;
        obj.setTime = setTime;
        obj.enableDaylight = enableDaylight;
        obj.disableDaylight = disableDaylight;
        obj.setParticleSize = setParticleSize;
        obj.getHoveredCountry = getHoveredCountry;
        obj.setRotationSpeed = setRotationSpeed;
        obj.setGeoDataColor = setGeoDataColor;
        obj.setGeoDataTexture = setGeoDataTexture;
        obj.clearGeoDataColor = clearGeoDataColor;
        //obj.shaders = shaders; /* export for debuging purposes */

        render();
        updateTime();
        obj.moveToCountry('EG');
        console.log("Globe initialized.");
        return obj;
    } catch (e) {
        // Something went wrong. WebGL or browser is not supported.
        try {
            GLOBE.HELPER.assertSupportedBrowsers();
            GLOBE.SCREENS.renderWebGLNotSupported();
        } catch (e) {
            GLOBE.SCREENS.renderUnsupportedBrowser();
            throw e;
        }
        console.log(e);
        throw e;
    }
};
