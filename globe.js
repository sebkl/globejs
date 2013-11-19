/**
 * @constructor
 */
GLOBE.TYPES.Globe = function (cid) {
	var obj = {};
	var containerId = cid;
	var container = $(cid).context.documentElement;
	var width = $(containerId).width();
	var height = $(containerId).height();
	if (width < 100 || height < 100) {
		console.log("WARNING: Very small area to display globe. Please adjust container size (Width: " + width + " Height: " + height+ ")");
	}
	var scene;
	var atmosphereScene;
	var camera;
	var renderer;
	var sphere;
	var particleSystem;

	/** Constants
	 * @const
	 */
	var PI_HALF = Math.PI / 2;
	var RADIUS = 200;
	var ATMOSPHERE_SIZE_FACTOR = 1.1;
  	var ZOOM_SPEED = 50;
	var ZOOM_CLICK_STEP = ZOOM_SPEED*2;
	var PILLAR_FULLSIZE = 100;
	var NO_COUNTRY = '0';
	var LINE_POINTS = 50; /* Amount of points used per line curve. */
	var LINE_HFAC = 0.2; /* Percentage of RADIUS the line curve will be heigh. */
	var LINE_COLOR  = 0x8888ff;
	var MIN_PILLAR_SIZE = 0.2;

	/* time */
	var time = new Date();

	/* texture URLs */
	var atlas_url = 'img/atlas.png';

	/* Camera moving : */
	var curZoomSpeed = 0;
	var vector = THREE.Vector3();

	var mouse = 		{ x: 0, y: 0 };
	var mouseOnDown = 	{ x: 0, y: 0, country: 0 };                                                                                                   
  	var rotation = 		{ x: 0, y: 0 };                                                                                                                              
      	var target = 		{ x: Math.PI*3/2, y: Math.PI / 6.0 };
      	var targetOnDown = 	{ x: 0, y: 0 };                                                                                                                          

	var overRenderer = true;
                                                                                                                                                              
	var distance = 100000;
	var distanceTarget = 100000;                                                                                                             
	var tic = 0;

	var particles; /* Particle geometry. */
	var particle_count = 10000;
	var particle_cursor = 0;

	var sphereGeometryHiRes;
	var sphereGeometryLowRes;
	var atmosphere;

	/* Attributes */
	obj.particleSize = 2;
	obj.particleLifetime = 200;
	obj.particleColor = [128,255,128 ];
	obj.particleIntensity = 1.0;

	/* earth uniforms */
	obj.brightness = 1.0;
	obj.colorization = 1.0;

	obj.hoverColor = [ 255,128,128 ];
	obj.colorIntensity = 0.4;
	obj.borderIntensity = 0.3;

	var projector;
	var mouse_polar;
	var overGlobe = false;

	var polar_container;

	var hovered_cc; /* country iso code that is currently hovered by the nouse . */
	var mouseMoveHandler = undefined;


	var pillars = [];
	var countryPillars = {};
	var pillarGeometry;

	var lines = []; /* Lines for country/polar connections */

	var countryDataColors = [];

	
	var enabled = true;

	var shaders = {                                                                                                                                             
    		'earth' : {
      			uniforms: {
        			'texture': { 
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
				"countrydata" : { 
					type: "t", 
					value:  createCountryDataTexture(countryDataColors = createCountryDataArray())
				},
				"selection" :{
					type: "v4",
					value:  countryColorToVector(obj.hoverColor,obj.colorIntensity)
				},
				"cintensity" :{
					type: "f",
					value: obj.colorIntensity
				},
				"bintensity" : {
					type: "f",
					value: obj.borderIntensity
				},
				"heightfactor" : {
					type: "f",
					value: 1.0
				},
				"calpha" :{
					type: "f",
					value: 1.0
				},
				"dayofyear" :{
					type: "f",
					value: 180.0
				},
				"hourofday" :{
					type: "f",
					value: 12.0
				}
      			},
      			vertexShader: [
				'varying vec3 vNormal;',
				'varying vec2 vUv;',
				'uniform sampler2D texture;',
				'uniform float heightfactor;',
				'void main() {',
				  'float hf = 1.0 - texture2D(texture,vec2(uv.x,(uv.y/2.0) + 0.5)).w;',
				  'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 - (hf*0.06*heightfactor) );',
				  'vNormal = normalize( normalMatrix * normal );',
				  'vUv = uv;',
				'}'
      			].join('\n'),
      			fragmentShader: [                                                                                                                                       
				'uniform sampler2D texture;',
				'uniform float brightness;',
				'uniform float color_intensity;',
				'uniform float mousex;',
				'uniform float mousey;',
				'uniform sampler2D countrydata;',
				'uniform float cintensity;',
				'uniform float calpha;',
				'uniform vec4 selection;',
				'uniform float dayofyear;',
				'uniform float hourofday;',
				'uniform float bintensity;',
				'varying vec3 vNormal;',
				'varying vec2 vUv;',
				'float daylight(float la, float doty,float hotd) {',
					'float l = (la * 180.0) - 90.0;',
					'float pi = 3.141592654;',
					'float p = asin(0.39795*cos(0.2163108 + 2.0*atan(0.9671396*tan(0.00860 * (doty - 186.0)))));',
					'float c = (sin(0.8333*pi/180.0) + sin(l*pi/180.0)*sin(p));',
					'float d = (cos(l*pi/180.0)*cos(p));',
					'float t = c/d;',
					't = (t > 1.0 ? 1.0 : t);',
					't = (t < -1.0 ? -1.0 : t);',
					'float ret = 0.0;',
					'float dld = (24.0 - (24.0 / pi)*acos( t))/2.0;',
					'if (hotd < (12.0 + dld) && hotd > (12.0 - dld)) {',
						'float n = (1.0-(abs(hotd - (12.0)) / (dld))) *10.0;',
						'ret = (n > 1.0 ? 1.0 : n);',
					'} else {',
						'ret = 0.0;',
					'}',
					'return ret;',

				'}',
				'void main() {',
						  'vec2 pos = vec2(mousex, ((1.0-mousey)/2.0));',
						  'vec2 vUv1 = vec2(vUv.x,(vUv.y/2.0) + 0.5);',
						  'vec2 vUv2 = vec2(vUv.x,(vUv.y/2.0));',
						  'vec4 ccol = vec4(0.0,0.0,0.0,0.0);',
						  'if (texture2D(texture,pos).x > 0.0 && texture2D(texture,pos).x == texture2D(texture,vUv2).x) {',
							'ccol = vec4(selection.xyz,calpha*selection.w);',
						  '} else {',
							'float par = 256.0;',
							'int cidx = int(texture2D(texture,vUv2).x * par);',
							'float cc = float(cidx) / par;',
							'if (cc > 0.0) {',
								'vec2 datapos = vec2(cc,0.0);',
								'vec3 col = texture2D(countrydata,datapos).xyz;',
								'ccol = vec4(col,cintensity*calpha);',
							'}',
						  '}',
 
						  'float day_factor = 1.0;',
						  'vec3 city_additive = vec3(0.0,0.0,0.0);',
						  'float swimfac = 0.035;',
						  'float swimd = (swimfac * 1.0);',
						  'if (dayofyear > 0.0) {',
						  	'float city_val = texture2D(texture,vUv2).z;',
							  'float hofd = (vUv.x*24.0)+hourofday;',
							  'day_factor = daylight(1.0- vUv.y,dayofyear,hofd > 24.0 ? hofd - 24.0 : hofd);',
							  'city_additive = vec3(city_val,city_val,city_val * 0.5) * (1.0 - day_factor);',
						  '}',
						  'vec3 border_additive = vec3(1.0,1.0,1.0) * (texture2D(texture,vUv2).y) * bintensity;',
						  'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
						  'vec3 atmosphere = vec3( 0.5, 0.5, 1.0 ) * pow( intensity, 3.0 );',
						  'vec3 diffuse = texture2D( texture, vUv1 ).xyz;',
						  'float col_int = color_intensity * (day_factor);',
						  'if (col_int < 1.0) {;',
						  	'float ci = (1.0 - col_int);',
						  	'float avgcv = (diffuse.x + diffuse.y + diffuse.z) / 3.0;',
							'float xa = (diffuse.x - avgcv)*ci;',
							'float ya = (diffuse.y - avgcv)*ci;',
							'float za = (diffuse.z - avgcv)*ci;',
							'diffuse = vec3(diffuse.x - xa,diffuse.y - ya, diffuse.z - za);',
						  '}',
						  'gl_FragColor = vec4( (diffuse * brightness * ((day_factor * 0.9) + 0.1)) + atmosphere + border_additive + (ccol.xyz * ccol.w) + city_additive, 1.0 );',
				'}'
			].join('\n')
    		},
    		'atmosphere' : {
      			uniforms: {},
      			vertexShader: [
				'varying vec3 vNormal;',
				'void main() {',
				  'vNormal = normalize( normalMatrix * normal );',
				  'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
				'}'
			].join('\n'),
      			fragmentShader: [
				'varying vec3 vNormal;',
				'void main() {',
				  'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
				  'gl_FragColor = vec4( 0.5, 0.5, 1.0, 1.0 ) * intensity;',
				'}'
			].join('\n')
    		},
		'particle' : {
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
					value: THREE.ImageUtils.loadTexture( 'img/particle.png' ) 
				},
				color: {
					type: 'v4',
					value: particleColorToVector(obj.particleColor,obj.particleIntensity)
				}
			},
			attributes: {
  				longitude: {
    					type: 'f',
    					value: []
				},
  				latitude: {
    					type: 'f',
    					value: []
				},
				longitude_d: {
    					type: 'f',
    					value: []
				},
				latitude_d: {
    					type: 'f',
    					value: []
				},
				created: {
    					type: 'f',
    					value: []
				},
				lifetime: {
    					type: 'f',
    					value: []
				},
				size: {
					type: 'f',
					value: []
				} 
			},
			vertexShader: [
				/* Using varying vNormal here would break the globe working on fu***ng Windows with the following errors:
				 *
				 * WebGL: INVALID_OPERATION: vertexAttribPointer: no bound ARRAY_BUFFER 
				 * WebGL: INVALID_OPERATION: drawArrays: attribs not setup correctly
				 *
				 * */
				'uniform float now;',
				'uniform float hitstart;',
				'uniform float hitend;',

				'attribute float longitude;',
				'attribute float latitude;',

				'attribute float longitude_d;',
				'attribute float latitude_d;',

				'attribute float created;',
				'attribute float lifetime;',

				'attribute float size;',

				'varying float age;',
				'vec4 convert_from_polar( vec3 coord )',
				'{',
					'float tmp = cos( coord.y );',
					'vec4 res = vec4(tmp * sin( coord.x ), sin( coord.y ), tmp * cos( coord.x ), 0.0) * coord.z;',
					'res.w = 1.0;',
					'return res;',
				'}',

				'void main() {',
					'age = ((max(now-created,0.0) /lifetime));',
					//'float age = ((max(now-created,0.0) /lifetime));',
					'if ( age <= 1.0 ) {',
						'vec2 way = vec2( (longitude*(1.0-age) + longitude_d*age), (latitude*(1.0-age) + latitude_d*age));',
						'float dage = age * 2.0;',
						'if (dage > 1.0) { dage = 2.0 - dage; }',
						//'vec4 coord = convert_from_polar(vec3(longitude,latitude,age * hitend + hitstart));',
						'vec4 coord = convert_from_polar(vec3(way,sin(age*3.142) * hitend + hitstart));',
						'gl_PointSize = dage * size + 0.5;',
						'gl_Position = projectionMatrix * modelViewMatrix * coord;',
					'} else {',
						'gl_PointSize = 0.0;',
						'gl_Position = projectionMatrix * modelViewMatrix * vec4(0.0,0.0,0.0,1.0);',
					'}',
				'}'

			].join('\n'),
			fragmentShader: [
				'uniform sampler2D texture;',
				'uniform vec4 color;',
				'varying float age;',
				'varying vec3 vNormal;',
				'varying vec2 vUv;',
				'void main() {',
					'float dage = age * 2.0;',
					'if (dage > 1.0) { dage = 2.0 - dage; }',
					'gl_FragColor = vec4(color.x,color.y,color.z,color.w - (dage*0.5));',
				
				'}'
			].join('\n')
		}
  	};
	
	function countryColorToVector(c,i) {
		return new THREE.Vector4(c[0]/256,c[1]/256,c[2]/256,i);
	}

	function particleColorToVector(c,i) {
		return new THREE.Vector4(c[0]/256,c[1]/256,c[2]/256,i);
	}

	function applyDatGuiControlConfiguration(gui) {
		var g = gui.addFolder('Globe');
		var p = g.addFolder('Particles');
		p.add(obj,'particleSize',1,100);
		p.add(obj,'particleLifetime',1,1000);
		p.addColor(obj,'particleColor').onChange(function(value) {
			shaders['particle'].uniforms.color.value = particleColorToVector(value,1.0);
			shaders['particle'].uniforms.needsUpdate = true;
		});

		var c = g.addFolder('Countries');
		c.add(obj,'colorIntensity',0,1.0).onFinishChange(function(value) { 
			shaders['earth'].uniforms.cintensity.value = value; 
			shaders['earth'].uniforms.needsUpdate = true;
		});

		c.add(obj,'borderIntensity',0,1.0).onFinishChange(function (value) {
			shaders['earth'].uniforms.bintensity.value = value; 
			shaders['earth'].uniforms.needsUpdate = true;
		});

				c.addColor(obj,'hoverColor').onChange(function(value) { 
			shaders['earth'].uniforms.selection.value = countryColorToVector(value,0.4);
			shaders['earth'].uniforms.needsUpdate = true;
		});
		c.add(obj,'clearCountryColors');

		var e = g.addFolder('Earth');
		obj.dayofyear = 1.0;
		e.add(obj,'dayofyear',1.0,356.0).onFinishChange(function (value) {
			shaders['earth'].uniforms.dayofyear.value = value; 
			shaders['earth'].uniforms.needsUpdate = true;
		});
		obj.hourofday = 0.0;
		e.add(obj,'hourofday',0.0,24.0).onFinishChange(function (value) {
			shaders['earth'].uniforms.hourofday.value = value; 
			shaders['earth'].uniforms.needsUpdate = true;
		});

		e.add(obj,'disableDaylight');
		e.add(obj,'enableDaylight');

		e.add(obj,'stop');
		e.add(obj,'start');
		e.add(obj,'brightness',0,1.0).onFinishChange(function(value) {
			shaders['earth'].uniforms.brightness.value = value;
			shaders['earth'].uniforms.needsUpdate = true;
		});

		e.add(obj,'colorization',0,1.0).onFinishChange(function(value) {
			shaders['earth'].uniforms.color_intensity.value = value;
			shaders['earth'].uniforms.needsUpdate = true;
		});

		e.add(obj,'lightOn');
		e.add(obj,'lightOut');

		var t = g.addFolder('Pillars');
		t.add(obj,'clearPillars');

		var l = g.addFolder('Lines');
		l.add(obj,'clearConnections');
	}


	function unsetCountryColor(opco) {
		if (opco === undefined || opco == "ALL") {
			console.log("Clearing all country colors.");
			this.clearCountryColors();
		} else {
			this.setCountryColor(opco,new THREE.Color(0x000000));
		}
	}


	function setCountryColor(iso,color) {
		try {
			console.log("Setting Globe country color: " + color.r + " " + color.g + " " + color.b);
			_setCountryColor(iso,countryDataColors,color);
			refreshCountryColors();
		} catch (err) {
			console.log("Cannot set Color for " + iso + " " + err);
		}
	}

	function _setCountryColor(iso,map,color) {
		var ma;

		if (iso instanceof Array) {
			ma = iso;
		} else {
			ma = [iso];
		}

		var a = map;
		for (var x = 0; x < ma.length;x++) {
			try {
				var i = GLOBE.GEO.country_to_index(ma[x].toUpperCase()) * 2;
				a[ i * 3] = color.r * 255;
				a[ i * 3 + 1] = color.g * 255;
				a[ i * 3 + 2] = color.b * 255;
			} catch (err) {
				console.log("Unknown country: " + ma[x] + ": "+ err);
			}
		}
	}

	function clearCountryColors() {
		switchCountryColors(createCountryDataArray());
	}

	function immediateClearCountryColors() {
		immediateSwitchCountryColorSet(createCountryDataArray());
	}

	function switchCountryColorSet(list, color) {
		var map = createCountryDataArray();
		_setCountryColor(list,map,color);
		switchCountryColors(map);
	}

	function immediateSwitchCountryColorSet(map) {
		countryDataColors = map;
		refreshCountryColors();
	}

	function switchCountryColors(map) {
		var tween = new TWEEN.Tween( { x: 1.0, y:1.0  } )
		    .to( { x: 1.1, y:0.0}, 300 )
		    .easing( TWEEN.Easing.Linear.EaseNone )
		    .onUpdate( function () {
			    shaders['earth'].uniforms.calpha.value = this.y;
			    atmosphere.scale.x= this.x * ATMOSPHERE_SIZE_FACTOR;
			    atmosphere.scale.y= this.x * ATMOSPHERE_SIZE_FACTOR;
			    atmosphere.scale.z= this.x * ATMOSPHERE_SIZE_FACTOR;

			    shaders['earth'].uniforms.needsUpdate = true;
			    atmosphere.needsUpdate=true;

		    } )
		    .onComplete( function () {
			    immediateSwitchCountryColorSet(map);
		    } )
		    .chain( new TWEEN.Tween( {x: 1.1, y:0.0 })
		    	.to( {x:1.0,y:1.0} , 300)
		    	.easing( TWEEN.Easing.Linear.EaseNone )
		    	.onUpdate( function () {
			    shaders['earth'].uniforms.calpha.value = this.y;
			    atmosphere.scale.x= this.x * ATMOSPHERE_SIZE_FACTOR;
			    atmosphere.scale.y= this.x * ATMOSPHERE_SIZE_FACTOR;
			    atmosphere.scale.z= this.x * ATMOSPHERE_SIZE_FACTOR;
			    shaders['earth'].uniforms.needsUpdate = true;
			    atmosphere.needsUpdate=true;
			} )

		    )
		    .start();
	}

	function refreshCountryColors() {
		shaders['earth'].uniforms.countrydata.value = createCountryDataTexture(countryDataColors);
		shaders['earth'].uniforms.needsUpdate = true;
	}

	function createCountryDataArray() {
		var rwidth = 256*2, rheight = 1, rsize = rwidth * rheight;
		var dataColor = new Uint8Array( rsize * 3 );

		for ( var i = 0; i < rsize; i ++ ) {
		    dataColor[ i * 3 ]     = 0;
		    dataColor[ i * 3 + 1 ] = 0;
		    dataColor[ i * 3 + 2 ] = 0;
		}

		return dataColor;
	}

	function createCountryDataTexture(a) {
		var text = new THREE.DataTexture( a, 256*2, 1, THREE.RGBFormat );
		text.magFilter = THREE.NearestFilter; /* DEFAULT: THREE.LinearFilter;  */
		text.minFilter = THREE.NearestMipMapNearestFilter; /* DEFAULT : THREE.LinearMipMapLinearFilter; */
		//text.minFilter = THREE.NearestFilter; /* DEFAULT : THREE.LinearMipMapLinearFilter; */
		text.needsUpdate = true;
		return text;
	};

	function calibrate_longitude(x) {
		x += 90;
		if (x > 180)
			x-=360;
		return x;
	}

	function decalibrate_longitude(x) {
		x -= 90;
		return x;
	}

	function degree_to_radius_longitude(v) {
		return calibrate_longitude(v)*(( 1 /360.0) * 2 * Math.PI);
	}

	function degree_to_radius_latitude(v) {
		return -v*(( 1 /360.0) * 2 * Math.PI);
	}

	function radius_to_degree_longitude(v) {
		return (v / (( 1 /360.0) * 2 * Math.PI));
	}

	function radius_to_degree_latitude(v) {
		return -(v / (( 1 /360.0) * 2 * Math.PI));
	}

	function buildParticles() {

		var shader = shaders['particle'];
		var longs = shader.attributes.longitude.value;
		var lats = shader.attributes.latitude.value;
		var destx = shader.attributes.longitude_d.value;
		var desty = shader.attributes.latitude_d.value;
		var lifetimes = shader.attributes.lifetime.value;
		var created = shader.attributes.created.value;
		var sizes = shader.attributes.size.value;
		//var dummyTexture = THREE.ImageUtils.generateDataTexture( 1, 1, new THREE.Color( 0xffffff ) );

		particles = new THREE.Geometry();
		for (var i = 0; i < particle_count;i++) {

			particles.vertices[i] =  new THREE.Vector3(0,0,0);
			longs[i] = degree_to_radius_longitude(0);
			lats[i] = degree_to_radius_latitude(0);
			created[i] = tic;
			destx[i] = degree_to_radius_longitude(0);
			desty[i] = degree_to_radius_latitude(0);
			lifetimes[i] = 0;
			sizes[i] = 0;
		}

		//var material = new THREE.ParticleBasicMaterial( {
		var material = new THREE.ShaderMaterial ( {
				uniforms: shader.uniforms,
				attributes: shader.attributes,
				vertexShader: shader.vertexShader,
				fragmentShader: shader.fragmentShader,
				transparent: true,
				blending: THREE.AdditiveBlending,
				//depthTest: true
				depthTest: true,
				wireframe: true

				//map: dummyTexture
		});

		particleSystem = new THREE.ParticleSystem(
			particles,
			material
		);

		particleSystem.dynamic=true;
		scene.add(particleSystem);
		console.log("Particles initialized.");
	}

	function createSourceParticle(x,y) {
		createMoveParticle(x,y,x,y);
	}

	function createMoveParticle(x,y,dx,dy) {
		createParticle(x,y,dx,dy,obj.particleLifetime,obj.particleSize);
	}

	function createParticle(x,y,dx,dy,lifetime,particleSize) {
		if (particles !== undefined) {
			var shader = shaders['particle'];
			var longs = shader.attributes.longitude.value;
			var lats = shader.attributes.latitude.value;
			var destx = shader.attributes.longitude_d.value;
			var desty = shader.attributes.latitude_d.value;
			var lifetimes = shader.attributes.lifetime.value;
			var created = shader.attributes.created.value;
			var sizes = shader.attributes.size.value;

			var i = particle_cursor;


                        if ( (tic - created[i]) < lifetimes[i] ) {
				console.log("Particle buffer overflow ;)");
			}

			longs[i] = (degree_to_radius_longitude(x));
			lats[i] = (degree_to_radius_latitude(y));
			created[i] = (tic);
			destx[i] = (degree_to_radius_longitude(dx));
			desty[i] = (degree_to_radius_latitude(dy));
			lifetimes[i] = (lifetime);
			sizes[i] = particleSize;

			shader.attributes.longitude.needsUpdate=true;
			shader.attributes.latitude.needsUpdate=true;
			shader.attributes.longitude_d.needsUpdate=true;
			shader.attributes.latitude_d.needsUpdate=true;
			shader.attributes.created.needsUpdate=true;
			shader.attributes.lifetime.needsUpdate=true;
			shader.attributes.size.needsUpdate=true;

			particle_cursor++;

			if (particle_cursor > particle_count) {
				particle_cursor = 0;
			}
		}
	}

	function getSphereGeometryHiRes() {
		if (sphereGeometryHiRes === undefined) {
			sphereGeometryHiRes = new THREE.SphereGeometry( RADIUS,80,40 );
		}

		return sphereGeometryHiRes;
	}

	function getSphereGeometryLowRes() {
		if (sphereGeometryLowRes === undefined) {
			sphereGeometryLowRes = new THREE.SphereGeometry( RADIUS,40,20 );
		}
		return sphereGeometryLowRes;
	}


	/** Create the earth sphere object. 
	 */
	function buildSphere() {
		var shader = shaders['earth'];

		var texture = THREE.ImageUtils.loadTexture(atlas_url);
		shader.uniforms['texture'].value = texture;

		var sphereMaterial = new THREE.ShaderMaterial ( {
			uniforms: shader.uniforms,
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader
		} );

		sphere = new THREE.Mesh( 
			getSphereGeometryHiRes(),
			sphereMaterial
		);

		scene.add(sphere);
		console.log("GLOBE sphere initialized.");
	}

	function buildAtmosphere() {
		var shader = shaders['atmosphere'];
		var atmosphereMaterial = new THREE.ShaderMaterial ( {
			uniforms: shader.uniforms,
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader,
			side: THREE.BackSide,
		    	transparent: true,
		    	opacity: 1.0

		} );

		atmosphere = new THREE.Mesh(
			getSphereGeometryLowRes(),
			atmosphereMaterial
		);

		atmosphere.scale.x = atmosphere.scale.y = atmosphere.scale.z = ATMOSPHERE_SIZE_FACTOR;
		//scene.add(atmosphere);
		atmosphereScene.add(atmosphere);
		console.log("Atmosphere initialized");
	}

	function buildDataPillars() {
		pillarGeometry = new THREE.CubeGeometry(0.75, 0.75, 1, 1, 1, 1, undefined, false, { px: true, nx: true, py: true, ny: true, pz: false, nz: true});
		for (var i = 0; i < pillarGeometry.vertices.length; i++) {
			var vertex = pillarGeometry.vertices[i];
			//vertex.position.z += 0.5;
			vertex.z += 0.5;
		}
		console.log("Data Pillars initialized.");
	}

	function factorToColor(factor) {
		var c = new THREE.Color();
		c.setHSL( ( 0.6 - ( factor * 0.5 ) ), 1.0, 0.5 );
		//c.setHSL( 0.1 , 1.0, 0.5 );
		//c.setHSV( ( 0.6 - ( factor * 0.5 ) ), 1.0, 1.0 );
		return c;
	}

	function addDataPillar(lat,lng,factor) {
		return addPillar(lat,lng,factor*PILLAR_FULLSIZE, factorToColor(factor).getHex());
	}

	function addCountryPillar(iso,factor) {
		var p;
		if (countryPillars[iso] !== undefined) {
			p = countryPillars[iso];
			changePillarFactor(p,factor);
		} else {
			var co = GLOBE.GEO.lookup_geo_points(iso);
			//console.log("" + iso + " (" + co[0] + "," + co[1] + ")");
			p = addDataPillar(co[0],co[1],factor);
			countryPillars[iso] = p;
		}
		return p;
	}

	function connectCountry(from,to,intensity) {
		var f = GLOBE.GEO.lookup_geo_points(from)
		var t = GLOBE.GEO.lookup_geo_points(to);
		return connectPolar(f[0],f[1], t[0], t[1],intensity);
	}

	function connectPolar(x,y,dx,dy,intensity) {
		return createLine(x,y,dx,dy,intensity);
	}

	function addPolarConnections(data,i) {
		return createLines(data,i);
	}

	function createLine(geo_x,geo_y,geo_dx,geo_dy, intensity) {
		return createLines([[geo_x,geo_y,geo_dx,geo_dy]],intensity);
	}

	function createLines(data,intensity) {
		var lineGeometry = new THREE.Geometry();
		var inte = intensity || 1.0;
		var idx;
		for (idx = 0; idx < data.length; idx++) {
			var l = data[idx]
			var geo_x = l[0];
			var geo_y = l[1];
			var geo_dx = l[2];
			var geo_dy = l[3];

			var from = new THREE.Vector3(degree_to_radius_longitude(geo_x),degree_to_radius_latitude(geo_y),RADIUS);
			var to = new THREE.Vector3(degree_to_radius_longitude(geo_dx),degree_to_radius_latitude(geo_dy),RADIUS);

			var lp = LINE_POINTS -1;

			try {
				for (var i = 0; i <= lp; i++) {
						var age = i/lp;
						var v = new THREE.Vector3(0,0,0);
						v.x = from.x*(1.0-age) + to.x * age;
						v.y = from.y*(1.0-age) + to.y * age;
						v.z = RADIUS + (Math.sin(age*Math.PI) * LINE_HFAC * RADIUS);
						var t = convert_from_polar(v);
						//console.log("(" + t.x +"," + t.y + "," + t.z + ")");
						lineGeometry.vertices.push(t);
				}
			} catch (e) {
				console.log(" Adding line failed: " + e);
			}
		}
		console.log("Added : " + idx)

		var lineMaterial = new THREE.LineBasicMaterial( { 
				color: 		LINE_COLOR, 
				opacity: 	inte, 
				transparent: 	true,
				linewidth: 1 } 
		);

		var line = new THREE.Line( lineGeometry, lineMaterial, THREE.LineStrip );
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
		for (var i = 0; i < lines.length; i ++) {
			scene.remove(lines[i]);
		}
		lines = [];
	}

	function addPillar(lng,lat, size,color) {
		var pos =convert_from_polar(new THREE.Vector3(degree_to_radius_longitude(lng),degree_to_radius_latitude(lat),RADIUS));

    		var pillar = new THREE.Mesh(pillarGeometry, new THREE.MeshBasicMaterial( { color: color }));

		pillar.position = pos;

		pillar.lookAt(scene.position);
		pillar.scale.z = -((size*(1.0-MIN_PILLAR_SIZE)) + MIN_PILLAR_SIZE);
		blendPillar(pillar,0.0,1.0);
		pillars.push(pillar);
		scene.add(pillar);
		return pillar;
	}

	function blendPillar(pillar,f_fac,t_fac,complete) {

		var tween = new TWEEN.Tween( { 
					x: pillar.scale.x* f_fac,
	       				y: pillar.scale.y* f_fac,
					z: pillar.scale.z* f_fac
				} )
				.to( { 	x: pillar.scale.x*t_fac, 
					y: pillar.scale.y*t_fac,
					z: pillar.scale.z*t_fac
				
				
				}, 1000 )
				.easing( TWEEN.Easing.Linear.EaseNone )
				.onUpdate( function () {
					pillar.scale.z = this.z;
					pillar.scale.x = this.x;
					pillar.scale.y = this.y;
					pillar.needsUpdate = true;

				} );

		if (complete !== undefined) {
			tween = tween.onComplete(complete);
		}

		tween.start();
	}

	function lightOut() {
		changeColorMode(0.4,0.0);
	}

	function lightOn() {
		changeColorMode(1.0,1.0);
	}

	function changeColorMode(bn,ci) {
		var tween = new TWEEN.Tween( {
				b: shaders['earth'].uniforms.brightness.value,
				c: shaders['earth'].uniforms.color_intensity.value
		}).to({ 	b: bn,
				c: ci
		}, 500)
		.easing(TWEEN.Easing.Linear.EaseNone )
		.onUpdate(function() {
			shaders['earth'].uniforms.brightness.value = this.b;
			shaders['earth'].uniforms.color_intensity.value = this.c;
			shaders['earth'].uniforms.needsUpdate = true;
		}).start();
	}

	function switchDataPillars(data) {
		clearPillars(function () {
			addDataPillars(data);
		});
	}

	/* Creates a static set of Pillars based on the data array. All pillars are created as a big geometry which improves rendering performance.
	 * data array format : [ [long,lat,size_factor], [...], ... ]
	 * These pillars can not be split up and following to that can only be removed from scene at once.
	 * */
	function addDataPillars(data) {
		var max = 0;
		for (var i = 0; i < data.length;i++) {
			if (data[i][2] > max) {
				max = data[i][2];
			}
		}
		var pg = pillarGeometry;

		/* Mother geometry */
		var subgeo = new THREE.Geometry();
		var point = new THREE.Mesh(pg,THREE.MeshFaceMaterial());
		for (var i = 0; i < data.length;i++) {
			var lng = data[i][0];
			var lat = data[i][1];
			var val = data[i][2]/max;
			var pos =convert_from_polar(new THREE.Vector3(degree_to_radius_longitude(lng),degree_to_radius_latitude(lat),RADIUS));
			var color = factorToColor(val);
			var scale = -((val*PILLAR_FULLSIZE));
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

		blendPillar(points,0.0,1.0);
		pillars.push(points);
		scene.add(points);
		return points;
	}

	function changePillarFactor(pillar,factor) {
		pillar.material.color = factorToColor(factor); // TODO: include this in animation.
		var tween = new TWEEN.Tween( {x: pillar.scale.z } )
			.to ( {x: -(PILLAR_FULLSIZE*factor)}, 1000 )
            		.easing( TWEEN.Easing.Linear.EaseNone )
            		.onUpdate( function () {
				pillar.scale.z = this.x;
				pillar.needsUpdate = true;

            		} )
            		.start();
		return pillar;
	}

	function disableDaylight() {
		setTime(null);
	}

	function enableDaylight() {
		updateTime();
	}

	function updateTime() {
		setTime(new Date());
	}

	function setTime(d) {
		if (d !== undefined && d != null) {
			time = d;
			var h = d.getUTCHours() - 12.0;
			var doy = (GLOBE.HELPER.dayOfYear(d)-1) - 180.0;

			if (h < 0) {
				h = 24.0 + h;
			}

			if (doy < 0){
				doy = 356.0 + doy;
			}

			shaders['earth'].uniforms.hourofday.value = h;
			shaders['earth'].uniforms.dayofyear.value = doy + 1.0;
			shaders['earth'].uniforms.needsUpdate = true;
		} else {
			shaders['earth'].uniforms.hourofday.value = 0.0;
			shaders['earth'].uniforms.dayofyear.value = 0.0;
			shaders['earth'].uniforms.needsUpdate = true;
		}
	};

	/* Blend out/Remove all registered pillars. 
	 * Objects will also be removed from scene after animation is complete.
	 * */
	function clearPillars(callback) {
		var pil = pillars;
		pillars = [];
		for (var i = 0; i < pil.length; i++) {
			blendPillar(pil[i],1.0,0.0, function() {
				scene.remove(pil[i]);
				if (callback !== undefined && (i == (pil.length-1))) {
					callback();
				}
			});
		}
		if ((pil.length == 0) && (callback !== undefined)) {
			callback();
		}
	}

	function onMouseInContainer(e) {
		console.log("Inside container");
		overRenderer = true;
		//container.addEventListener('mousedown', onMouseDown, true);
		$(containerId).bind('mousedown',undefined, onMouseDown);
	}

	function onMouseOutContainer(e) {
		console.log("Outside container");
		updateHoverHandler(NO_COUNTRY);	
      		overRenderer = false;
		$(containerId).unbind('mousedown', onMouseDown);
	}

	function eventCountryHover(e,iso) {
		obj.setHoverCountry(iso);
	}

	function eventCountryUnhover(e) {
		obj.setHoverCountry('0');
	}

	/** Internally used gunction to deal with color set events for a country.
	 * It assigns a user specified color to the given country. Event parameter is actually ignored. */
	function eventSetCountryColor(e,opco,col) {
		console.log("Setting color for country: " + opco);
		obj.setCountryColor(opco,col);
	}

	/* Internally used function to deal with color unset event for a country.
	 * It removes the currently assigned color of the given country. Event parameter is actually ignored. */
	function eventUnsetCountryColor(e,opco) {
		obj.unsetCountryColor(opco);
	}

	function eventNavigationZoomIn(e) {
		zoom(ZOOM_CLICK_STEP);
	}

	function eventNavigationZoomOut(e) {
		zoom(-ZOOM_CLICK_STEP);
	}

	function eventCountryFocus(e,opco) {
		obj.moveToCountry(opco);
	}

	/** Add all relevant Event listeners */
	function addEventListeners() {
		console.log("Adding event Listener for 3D globe.");

		/* Set event handler for environment */
		$(document).bind('country:focus',eventCountryFocus);
		$(document).bind('country:hover',eventCountryHover);
		$(document).bind('country:unhover',eventCountryUnhover );

		/*Steup event Listeners. */
		window.addEventListener('resize', onWindowResize, false);
		$(containerId).bind('mousedown', undefined, onMouseDown);
		$(containerId).bind('mousewheel',undefined,  onMouseWheel);
		$(containerId).bind('mousemove',undefined,  onMouseBrowse);
    		//document.addEventListener('keydown', onDocumentKeyDown, false);                                                                                           
		$(containerId).bind('mouseover',undefined,  onMouseInContainer);
		$(containerId).bind('mouseout',undefined,  onMouseOutContainer);

		$(document).bind('country:color:set', eventSetCountryColor);
		$(document).bind('country:color:unset', eventUnsetCountryColor);

		$(document).bind('navigation:zoom:in', eventNavigationZoomIn);
		$(document).bind('navigation:zoom:out', eventNavigationZoomOut);
	}

	/** Remove all relevant Event listeners */
	function removeEventListeners() {
		window.removeEventListener('resize', onWindowResize, true);
		$(containerId).unbind('mousedown', onMouseDown);
		$(containerId).unbind('mousewheel', onMouseWheel);
		$(containerId).unbind('mousemove', onMouseBrowse);
		$(containerId).unbind('mouseover', onMouseInContainer);
		$(containerId).unbind('mouseout', onMouseOutContainer);

		$(document).unbind('country:focus',eventCountryFocus);
		$(document).unbind('country:hover',eventCountryHover);
		$(document).unbind('country:unhover',eventCountryUnhover );

		$(document).unbind('country:color:set', eventSetCountryColor);
		$(document).unbind('country:color:unset', eventUnsetCountryColor);

		$(document).unbind('navigation:zoom:in', eventNavigationZoomIn);
		$(document).unbind('navigation:zoom:out', eventNavigationZoomOut);
	}

	function init() {
		scene = new THREE.Scene();
		atmosphereScene = new THREE.Scene();
		projector = new THREE.Projector();
		//camera = new THREE.PerspectiveCamera( 45, width/height, 0.1, 10000);
		//camera = new THREE.PerspectiveCamera(30, width / height, 1, 10000);
		camera = new THREE.PerspectiveCamera(30, width / height, 1, 10000);
		renderer = new THREE.WebGLRenderer();
		renderer.setSize( window.innerWidth, window.innerHeight );                                                                                                
    		//renderer.setClearColorHex(0x000000, 0.0);
    		renderer.setClearColor(0x000000, 0.0);
		renderer.autoClear = false;

		scene.add(camera);
		camera.position.z = distance;

		//registerEventListener()

		$(containerId).append($(renderer.domElement));
		console.log("GLOBE initialized.");
	}

	function render() {
		zoom(curZoomSpeed);
	    	rotation.x += (target.x - rotation.x) * 0.1;
	    	rotation.y += (target.y - rotation.y) * 0.1;
	    	distance += (distanceTarget - distance) * 0.3;
	    	camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
	    	camera.position.y = distance * Math.sin(rotation.y);
	    	camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);

		camera.lookAt(scene.position);
		camera.updateProjectionMatrix();
		renderer.clear();
	    	renderer.render(scene, camera);
		renderer.render(atmosphereScene, camera);
	}

	function animate() {
		if (enabled) {
			requestAnimationFrame(animate);                                                                                                                           
			TWEEN.update();
			tic+=1;
			shaders['particle'].uniforms.now.value = tic;

			render();
		}
	}

	function zoom(delta) {
		distanceTarget -= delta;
		var min = RADIUS * 1.1;
		var max = RADIUS * 5;
		distanceTarget = distanceTarget > max ? max : distanceTarget;
		distanceTarget = distanceTarget < min ? min : distanceTarget;

		// scale atmosphere according to zoom level. This makes atmosphere more realistic in deep zoom mode.
		var scaleFactor = 1.0 - ((distance - min) / (max-min) );
		atmosphere.scale.x = atmosphere.scale.y = atmosphere.scale.z = (ATMOSPHERE_SIZE_FACTOR + (scaleFactor * 0.05)) ;
	}

	function onMouseDown(event) {
		/* Check whether mouse is over sphere. Only in this case the spehere should be rotatable */
		var intersects = getIntersects(event);
	       	if (intersects.length >= 1) {
			//event.preventDefault();
			$(containerId).bind('mousemove',undefined, onMouseMove);
			$(containerId).bind('mouseup',undefined, onMouseUp);
			$(containerId).bind('mouseout',undefined, onMouseOut);
			mouseOnDown.x = - event.clientX;
			mouseOnDown.y = event.clientY;
			mouseOnDown.country = hovered_cc;
			targetOnDown.x = target.x;
			targetOnDown.y = target.y;
			container.style.cursor = 'move';
		}
	}

	function convert_from_polar(polar) {
		var tmp = Math.cos(polar.y);
		var depth = polar.z;
		var ret = new THREE.Vector3(depth * tmp * Math.sin( polar.x), depth * Math.sin(polar.y), depth * tmp * Math.cos(polar.x));
		return ret;
	}

	function convert_to_polar(coord) {

		var x = Math.atan( coord.x/ coord.z);
		var y = Math.atan( (coord.y * Math.cos(x)) / coord.z);

		x = x * 180 / Math.PI;
		y = y * 180 / Math.PI;

		// var y = Math.asin(coord.y / RADIUS);
		//var x = Math.asin( ( coord.x/(RADIUS * Math.acos(y)) ) );
		//
		if (coord.z < 0) {
			x = x+180;
		} else {
			y = -y;
		}

		x = x - 90;

		if (x > 180)
			x = x - 360;

		var ret = new THREE.Vector2(x,y);
		return ret;
	}

	function setHoverCountry(iso) {
		try {
			if (iso != hovered_cc) {
				hovered_cc = iso;
				var geo = GLOBE.GEO.lookup_geo_points(iso);
				geo[0]=(geo[0] + 180) /360;
				geo[1]=(geo[1] + 90) / 180;

				shaders['earth'].uniforms.mousex.value = geo[0];
				shaders['earth'].uniforms.mousey.value = geo[1];
			}
		} catch (err) {

		}
	}

	function updatePolarCoordinates(vec) {
		var cc = GLOBE.GEO.lookup_country(vec.x,vec.y);

		var v = new THREE.Vector2( (vec.x + 180) / 360, (vec.y+90)/180);
		$(document).trigger('polar:hover', [ Math.round(vec.x * 10)/10, Math.round(vec.y * 10) /10 ]);

		updateHoverHandler(cc);

		shaders['earth'].uniforms.mousex.value = v.x;
		shaders['earth'].uniforms.mousey.value = v.y;
	}

	function updateHoverHandler(cc) {
		if (cc != hovered_cc) {
			hovered_cc = cc;
			$(document).trigger('country:hover',hovered_cc);
			if (cc == NO_COUNTRY) {
				shaders['earth'].uniforms.mousex.value = 0;
				shaders['earth'].uniforms.mousey.value = 0;
			}
		}
	}

	function getIntersects(event) {
		event.preventDefault();
		var vector = new THREE.Vector3( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1, 0.5 );
		projector.unprojectVector( vector, camera );
		var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
		var intersects = ray.intersectObjects( [ sphere ] );
		return intersects;
	}

	function onMouseBrowse(event) {
		if (overRenderer) {
			var intersects = getIntersects(event);
			if (intersects.length == 1) {
				overGlobe = true;
				var i = 0;
				var vec = new THREE.Vector3(intersects[i].point.x,intersects[i].point.y,intersects[i].point.z);
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
		var camt = convert_from_polar(new THREE.Vector3(degree_to_radius_longitude(po[0]), degree_to_radius_latitude(po[1]),RADIUS*2));

		target.x = degree_to_radius_longitude(po[0]);
		target.y = degree_to_radius_latitude(po[1]);

		camera.position = camt;
		camera.lookAt(scene.position);
		return [ target.x , target.y ];
	}

	function getCamTargetPos() {
		return [ target.x, target.y ];
	}

	function setCamTargetPos(x,y) {
		target.x = x;
		target.y = y;
	}

	function onMouseMove(event) {
		mouse.x = - event.clientX;
		mouse.y = event.clientY;
		var zoomDamp = distance/1000;
		target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
		target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;
		target.y = target.y > PI_HALF ? PI_HALF : target.y;
		target.y = target.y < - PI_HALF ? - PI_HALF : target.y;
	}

	function onMouseUp(event) {
		$(containerId).unbind('mousemove', onMouseMove);
		$(containerId).unbind('mouseup', onMouseUp);
		$(containerId).unbind('mouseout', onMouseOut);
		container.style.cursor = 'auto';
		//createSourceParticle(mouse_polar.x,mouse_polar.y);
		//console.log(mouse_polar.x + " " + mouse_polar.y);
		if (hovered_cc == mouseOnDown.country) {
			$(document).trigger('country:click',hovered_cc);
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
	function onWindowResize( event ) {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( window.innerWidth, window.innerHeight );
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

	/* Plug all together */
	init();
	buildParticles();
	buildSphere();
	buildAtmosphere();
	buildDataPillars();

	/* MAP API */
	obj.createSourceParticle = createSourceParticle;
	obj.createMoveParticle = createMoveParticle;

	obj.setMouseMoveHandler = setMouseMoveHandler;
	obj.clearPillars = clearPillars;
	obj.switchDataPillars = switchDataPillars;
	obj.addPillar = addPillar;
	obj.addDataPillars = addDataPillars;
	obj.addDataPillar = addDataPillar;
	obj.addCountryPillar = addCountryPillar;
	obj.moveToCountry = moveToCountry;
	obj.setCountryColor = setCountryColor;
	obj.unsetCountryColor = unsetCountryColor;
	obj.clearCountryColors = clearCountryColors;
	obj.applyDatGuiControlConfiguration = applyDatGuiControlConfiguration;
	obj.switchCountryColorSet = switchCountryColorSet;
	obj.setHoverCountry = setHoverCountry;
	obj.stop = stop;
	obj.start = start;
	obj.immediateSwitchCountryColorSet = immediateSwitchCountryColorSet;
	obj.immediateClearCountryColors = immediateClearCountryColors;
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

	render();
	updateTime();
	obj.moveToCountry('EG');
	console.log("Globe initialized.");
	return obj;
}
