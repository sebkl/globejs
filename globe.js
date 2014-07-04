/**
 * @constructor
 */
GLOBE.TYPES.Globe = function (cid) {
	try {
		var obj = {};
		var containerId = cid;
		var container = $(cid).context.documentElement;
		var width = $(containerId).width() -5 ;
		var height = $(containerId).height() -5 ;
		$("body").css("overflow", "hidden");
		if (width < 100 || height < 100) {
			console.log("WARNING: Very small area to display globe. Please adjust container size (Width: " + width + " Height: " + height+ ")");
		}
		var scene;
		var atmosphereScene;
		var particleScene;
		var camera;
		var renderer;
		var sphere;
		var particleSystem;

		/** Constants
		 * @const
		 */
		var PI_HALF = Math.PI / 2;
		var RADIUS = 200;
		var ATMOSPHERE_SIZE_FACTOR = 1.11;
		var ZOOM_SPEED = 50;
		var ZOOM_CLICK_STEP = ZOOM_SPEED*2;
		var PILLAR_FULLSIZE = 100;
		var NO_COUNTRY = '0';
		var LINE_POINTS = 50; /* Amount of points used per line curve. */
		var LINE_HFAC = 0.2; /* Percentage of RADIUS the line curve will be heigh. */
		var LINE_COLOR  = 0x8888ff;
		var MIN_PILLAR_SIZE = 0.2;
		var lightMode = {
			"MOUSE": 0,
			"DEFAULT": 1,
			"TIME": 2,
			"DAY": 2,
			"current": 0
		};

		/* time */
		var time = new Date();

		/* (x,y,z):
		 *  x => -1 .. 1 (left to right)
		 *  y => -1 .. 1 (bottom to top)
		 *  z => -1 .. 1 (back to front) */
		var defaultLight = new THREE.Vector3(-0.5,0.0,1.0); // front bottom (slight left)
		var defaultLightIntensity = new THREE.Vector3(1.0,1.0,1.0);

		/* country map */
		var countryTweenMap= {}

		/* texture URLs */
		var atlas_url = 'img/atlas.png';
		var cmap_url = 'img/cmap.png';

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
		obj.particleSize = 20;
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

		var enabled = true;

		var shaders = {};
				
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
				_setCountryColor(iso,color);
			} catch (err) {
				console.log("Cannot set Color for " + iso + " " + err);
			}
		}

		function _setCountryColor(iso,color,index) {
			var ma;

			if (iso instanceof Array) {
				ma = iso;
			} else {
				ma = [iso];
			}

			if (index === undefined) {
				index = 0;
			}

			var shader = shaders['earth'].uniforms.countrydata.value;

			for (var x = 0; x < ma.length;x++) {
				try {
					var c = GLOBE.GEO.country_to_index(ma[x].toUpperCase());
					var o = index * 256;
					var i = c + o;
					shader.image.data[ i * 3] = color.r * 255;
					shader.image.data[ i * 3 + 1] = color.g * 255;
					shader.image.data[ i * 3 + 2] = color.b * 255;
					_switchCountryColor(c);
				} catch (err) {
					console.log("Unknown country: " + ma[x] + ": "+ err);
				}
			}
		}

		function immediateClearCountryColors() {
			var tex =  createCountryDataTexture();
			shaders['earth'].uniforms.countrydata.value = tex;
			shaders['earth'].uniforms.needsUpdate = true;
		}

		function clearCountryColors() {
			var shader = shaders['earth'].uniforms.countrydata.value;
			for (var i = 0; i < 256; i ++) {
				shader.image.data[i * 3 + 0] = 0;
				shader.image.data[i * 3 + 1] = 0;
				shader.image.data[i * 3 + 2] = 0;
				_switchCountryColor(i);
			}
		}

		function switchCountryColorSet(list, color) {
			_setCountryColor(list,color);
		}

		function _switchCountryColor(idx) {
			var map = shaders['earth'].uniforms.countrydata.value;

			if (countryTweenMap[idx] !== undefined) {
				countryTweenMap[idx].stop();
				delete countryTweenMap[idx];
			}

			if ( 	map.image.data[ (256 + idx) * 3 + 0] == map.image.data[ (idx) * 3 + 0] &&
				map.image.data[ (256 + idx) * 3 + 1] == map.image.data[ (idx) * 3 + 1] &&
				map.image.data[ (256 + idx) * 3 + 2] == map.image.data[ (idx) * 3 + 2]	) {
				return;
			}

			var tween = new TWEEN.Tween( { 
				r: map.image.data[ (256 + idx) * 3 + 0],
				g: map.image.data[ (256 + idx) * 3 + 1],
				b: map.image.data[ (256 + idx) * 3 + 2]
			}).to ({
				r: map.image.data[ (idx) * 3 + 0],
				g: map.image.data[ (idx) * 3 + 1],
				b: map.image.data[ (idx) * 3 + 2]
			},500).onComplete(function() {
				delete countryTweenMap[idx];
			}).onUpdate( function() {
				map.image.data[ (256 + idx) * 3 + 0] = this.r;
				map.image.data[ (256 + idx) * 3 + 1] = this.g;
				map.image.data[ (256 + idx) * 3 + 2] = this.b;
				map.needsUpdate = true;
			}).easing( TWEEN.Easing.Linear.EaseNone )
			.start();
			countryTweenMap[idx] = tween;
		}

		function setCountryLightning(opco,color) {
			_setCountryColor(opco,color,1);
		}

		function getCountryLightning(opco) {
			var map = shaders['earth'].uniforms.countrydata.value;
			return new THREE.Color(
				map.image.data[ (256 + idx) * 3 + 0]/255,
				map.image.data[ (256 + idx) * 3 + 1]/255,
				map.image.data[ (256 + idx) * 3 + 2]/255
			);
		}

		function createCountryDataTexture() {
			var text = THREE.ImageUtils.generateDataTexture(256,2,new THREE.Color(0x000000));
			//var text = new THREE.DataTexture( a, 256, 2, THREE.RGBFormat );
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
			particleScene = new THREE.Scene();
			var shader = shaders['particle'];
			var longs = shader.attributes.longitude.value;
			var lats = shader.attributes.latitude.value;
			var destx = shader.attributes.longitude_d.value;
			var desty = shader.attributes.latitude_d.value;
			var lifetimes = shader.attributes.lifetime.value;
			var created = shader.attributes.created.value;
			var sizes = shader.attributes.size.value;
			var random = shader.attributes.size.value;
			var color = shader.attributes.color.value;
			var hf = shader.attributes.heightfactor.value;
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
				random[i] = 0.5;
				color[i] = particleColorToVector(obj.particleColor,obj.particleIntensity);
				hf[i] = 1.0;
			}

			var material = new THREE.ShaderMaterial ( {
					uniforms: shader.uniforms,
					attributes: shader.attributes,
					vertexShader: shader.vertexShader,
					fragmentShader: shader.fragmentShader,
					transparent: true,
					blending: THREE.AdditiveBlending,
					//depthTest: true
					depthTest: true,
					wireframe: true,
					depthWrite: false //Magic setting to make particles not clipping ;)

			});

			particleSystem = new THREE.ParticleSystem(
				particles,
				material
			);

			particleSystem.dynamic=true;
			particleScene.add(particleSystem);
			console.log("Particles initialized.");
		}

		function createSourceParticle(x,y,c,hf) {
			createMoveParticle(x,y,x,y,c,hf);
		}

		/* Create a particle that moves from (x,y) to (dx,dy)
		 * x  - origin longitude
		 * y  - origin latitude
		 * dx - target longitude
		 * dy - target latitude
		 * c  - color of marticle in [ 255,255,255 ] color notation 
		 * hf - height factor where 1 is standard height */
		function createMoveParticle(x,y,dx,dy,c,hf) {
			createParticle(x,y,dx,dy,obj.particleLifetime,obj.particleSize,c,hf);
		}

		function createParticle(x,y,dx,dy,lifetime,particleSize,c,hf) {
			if (particles !== undefined) {
				var shader = shaders['particle'];
				var longs = shader.attributes.longitude.value;
				var lats = shader.attributes.latitude.value;
				var destx = shader.attributes.longitude_d.value;
				var desty = shader.attributes.latitude_d.value;
				var lifetimes = shader.attributes.lifetime.value;
				var created = shader.attributes.created.value;
				var sizes = shader.attributes.size.value;
				var random = shader.attributes.random.value;
				var color = shader.attributes.color.value;
				var heightfactor = shader.attributes.heightfactor.value;

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
				random[i] = Math.random();

				if (c !== undefined && c != null) {
					color[i] = particleColorToVector(c,obj.particleIntensity);
				}

				if (hf !== undefined && hf != null) {
					heightfactor[i] = hf;
				}

				shader.attributes.color.needsUpdate=true;
				shader.attributes.heightfactor.needsUpdate=true;
				shader.attributes.longitude.needsUpdate=true;
				shader.attributes.latitude.needsUpdate=true;
				shader.attributes.longitude_d.needsUpdate=true;
				shader.attributes.latitude_d.needsUpdate=true;
				shader.attributes.created.needsUpdate=true;
				shader.attributes.lifetime.needsUpdate=true;
				shader.attributes.size.needsUpdate=true;
				shader.attributes.random.needsUpdate=true;

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

		/** Create the earth sphere object.  */
		function buildSphere() {
			var shader = shaders['earth'];

			var texture = THREE.ImageUtils.loadTexture(atlas_url);
			var countrymap = THREE.ImageUtils.loadTexture(cmap_url);

			//texture.minFilter = THREE.NearestMipMapNearestFilter; /* DEFAULT : THREE.LinearMipMapLinearFilter; */
			countrymap.magFilter = THREE.NearestFilter; /* DEFAULT: THREE.LinearFilter;  */
			countrymap.minFilter = THREE.NearestFilter; /* DEFAULT : THREE.LinearMipMapLinearFilter; */

			shader.uniforms['texture'].value = texture;
			shader.uniforms['countrymap'].value = countrymap;

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

		/** Create the earth atmosphere object. */
		function buildAtmosphere() {
			atmosphereScene = new THREE.Scene();
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

		function addDataPillar(lat,lng,factor) {
			return addPillar(lat,lng,factor*PILLAR_FULLSIZE, GLOBE.HELPER.factorToColor(factor).getHex());
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

		function _setPillarData(factor) {
			this.scale.z =-((factor*PILLAR_FULLSIZE*(1.0-MIN_PILLAR_SIZE)) + MIN_PILLAR_SIZE);
			this.material.color = new THREE.Color(GLOBE.HELPER.factorToColor(factor).getHex());
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
			pillar.setData = _setPillarData;
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
				var color = GLOBE.HELPER.factorToColor(val);
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
			pillar.material.color = GLOBE.HELPER.factorToColor(factor); // TODO: include this in animation.
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
			var disable = new THREE.Vector3(-1.0,-1.0,-1.0);
			shaders['earth'].uniforms.lightintensity.value = disable;
			shaders['atmosphere'].uniforms.lightintensity.value = disable;
		}

		function enableDaylight() {
			shaders['earth'].uniforms.lightintensity.value = defaultLightIntensity;
			shaders['atmosphere'].uniforms.lightintensity.value = defaultLightIntensity;
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

				//shaders['earth'].uniforms.hourofday.value = h;
				//shaders['earth'].uniforms.dayofyear.value = doy + 1.0;
				shaders['earth'].uniforms.needsUpdate = true;
				//TODO: Set light vector based on time
			} else {
				//shaders['earth'].uniforms.hourofday.value = 0.0;
				//shaders['earth'].uniforms.dayofyear.value = 0.0;
				shaders['earth'].uniforms.needsUpdate = true;
				//TODO: Set light vector based on time
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
			projector = new THREE.Projector();
			//camera = new THREE.PerspectiveCamera( 45, width/height, 0.1, 10000);
			//camera = new THREE.PerspectiveCamera(30, width / height, 1, 10000);
			camera = new THREE.PerspectiveCamera(30, width / height, 1, 10000);
			renderer = new THREE.WebGLRenderer();
			renderer.setSize( width, height );                                                                                                
			//renderer.setClearColorHex(0x000000, 0.0);
			//renderer.setClearColor(0x000000, 0.0);
			renderer.setClearColor(0x000000, 1);
			renderer.autoClear = false;
			renderer.setBlending(THREE.AdditiveBlending);

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
			renderer.render(particleScene, camera);
		}

		function animate() {
			if (enabled) {
				requestAnimationFrame(animate);                                                                                                                           
				TWEEN.update();
				tic+=1;
				shaders['particle'].uniforms.now.value = tic;
				shaders['particle'].uniforms.randomu.value = Math.random();

				// Wait 50 frames before sending initialized event.
				if (tic == 50) {
					$(document).trigger('globe:initialized',[]);
				}

				render();
			}
		}

		/* Zoom/Scale globe and atmosphere within given boundaries. 
		 * This is called for every frame render. */
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

				if (cc == NO_COUNTRY) {
					shaders['earth'].uniforms.mousex.value = 0;
					shaders['earth'].uniforms.mousey.value = 0;
					cc = null;
				}

				if (isNaN(cc) || cc == null) {
					$(document).trigger('country:hover',cc);
				} else {
					console.warn("Please map country id: " + cc);
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
				if (lightMode.current == lightMode.MOUSE) {
					/* Set light vector based on mouse position. Mouse emits light. */
					var lightv = new THREE.Vector3( (event.clientX * 2.0/window.innerWidth)-1.0, (event.clientY *-2.0 /window.innerHeight) +1.0,1.0);
					shaders['earth'].uniforms.lightvector.value = lightv;
					shaders['atmosphere'].uniforms.lightvector.value = lightv;
				}

				/* Set polar coordinates of mouse pointer. */
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

		function setParticleSize(size) {
			obj.particleSize = size;
		}

		shaders = {
			'earth' : {
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
					"countrydata" : { 
						type: "t", 
						value:  createCountryDataTexture()
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
					"lightvector" : {
						type: "v3",
						value:  defaultLight
					},
					"lightintensity": {
						type: "v3",
						value: defaultLightIntensity
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
					'uniform sampler2D countrymap;',
					'uniform float brightness;',
					'uniform float color_intensity;',
					'uniform float mousex;',
					'uniform float mousey;',
					'uniform sampler2D countrydata;',
					'uniform float cintensity;',
					'uniform float calpha;',
					'uniform vec4 selection;',
					'uniform float bintensity;',
					'uniform vec3 lightvector;',
					'uniform vec3 lightintensity;',
					'varying vec3 vNormal;',
					'varying vec2 vUv;',
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
							  'if (texture2D(countrymap,pos).x > 0.0 && texture2D(countrymap,pos).x == texture2D(countrymap,vUv).x) {',
								'ccol = vec4(selection.xyz,calpha*selection.w);',
								'ccol*=avgcol(texture2D(countrymap,pos).x);',
							  '} else {',
								'float par = 256.0;',
								'int cidx = int(texture2D(countrymap,vUv).x * par);',
								'float cc = float(cidx) / par;',
								'if (cc > 0.0) {',
									'vec2 datapos = vec2(cc,0.0);',
									'vec3 col = texture2D(countrydata,datapos).xyz;',
									'ccol = vec4(col,cintensity*calpha);',
								'}',
							  '}',

							  'vec3 city_additive = vec3(0.0,0.0,0.0);',
							  'float day_factor = 1.0;',

							  'if (lightintensity.x >= 0.0 && lightintensity.y >= 0.0 && lightintensity.z >= 0.0) {',
								  'vec3 lightv= normalize(lightvector);',
								  'day_factor = max(0.0,dot(vNormal, lightv));',
								  'if (day_factor < 5.0) {',
									'float city_val = texture2D(texture,vUv2).z;',
									'city_additive = vec3(city_val,city_val,city_val * 0.5) * (2.0 - (day_factor * 2.0));',
								  '}',
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
							  'gl_FragColor = vec4( (diffuse * brightness * (day_factor)) + (atmosphere * day_factor) + border_additive + (ccol.xyz * ccol.w) + city_additive, 1.0 );',
					'}'
				].join('\n')
			},
			'atmosphere' : {
				uniforms: {
					"lightvector" : {
						type: "v3",
						value:  defaultLight
					},
					"lightintensity": {
						type: "v3",
						value: defaultLightIntensity
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
					'uniform vec3 lightintensity;',
					'void main() {',
					  'vec3  lightv= normalize(lightvector);',
					  'float day_factor = dot(vNormal, lightv)+0.5;',
					  'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
					  'if (lightintensity.x < 0.0 || lightintensity.y < 0.0 || lightintensity.z < 0.0) {',
						  'day_factor = 1.0;',
					  '}',
					  'gl_FragColor = vec4( (day_factor * 1.5)  * vec3(0.5, 0.5, 1.0), 1.0 ) * intensity;',
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
					randomu: {
						type: 'f',
						value: 0.5
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
					color: {
						type: 'v4',
						value: []
					},
					size: {
						type: 'f',
						value: []
					}, 
					heightfactor: {
						type: 'f',
						value: []
					},
					random: { 	
						type: "f", 
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
					'vec4 convert_from_polar( vec3 coord )',
					'{',
						'float tmp = cos( coord.y );',
						'vec4 res = vec4(tmp * sin( coord.x ), sin( coord.y ), tmp * cos( coord.x ), 0.0) * coord.z;',
						'res.w = 1.0;',
						'return res;',
					'}',

					'void main() {',
						'age = ((max(now-created,0.0) / (lifetime + random * lifetime * 0.3)));',
						'col = color;',
						//'float age = ((max(now-created,0.0) /lifetime));',
						'if ( age <= 1.0 ) {',
							'vec2 way = vec2( (longitude*(1.0-age) + longitude_d*age), (latitude*(1.0-age) + latitude_d*age));',
							'float dage = age * 2.0;',
							'if (dage > 1.0) { dage = 2.0 - dage; }',
							//'vec4 coord = convert_from_polar(vec3(longitude,latitude,age * hitend + hitstart));',
							'vec4 coord = convert_from_polar(vec3(way,heightfactor * sin(age*3.142) * (hitend)  + hitstart ));',
							'gl_PointSize = dage * size * (1.0 + (random - 0.5)* 3.0  * (randomu)) ;' ,
							'gl_Position = projectionMatrix * modelViewMatrix * coord;',
						'} else {',
							'gl_PointSize = 0.0;',
							'gl_Position = projectionMatrix * modelViewMatrix * vec4(0.0,0.0,0.0,1.0);',
						'}',
						//'vUv = uv;',
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

						'float d = texture2D( texture, gl_PointCoord ).r ;',
						'd = d * d;',
						//'float d = 1.0;',
						/*
						"vec2 vUv = gl_PointCoord;",
						"float d = 0.0;",

						"d += texture2D( texture, vec2( vUv.x, vUv.y - 4.0 * v ) ).r * 0.051;",
						"d += texture2D( texture, vec2( vUv.x, vUv.y - 3.0 * v ) ).r * 0.0918;",
						"d += texture2D( texture, vec2( vUv.x, vUv.y - 2.0 * v ) ).r * 0.12245;",
						"d += texture2D( texture, vec2( vUv.x, vUv.y - 1.0 * v ) ).r * 0.1531;",
						"d += texture2D( texture, vec2( vUv.x, vUv.y ) ).r * 0.1633;",
						"d += texture2D( texture, vec2( vUv.x, vUv.y + 1.0 * v ) ).r * 0.1531;",
						"d += texture2D( texture, vec2( vUv.x, vUv.y + 2.0 * v ) ).r * 0.12245;",
						"d += texture2D( texture, vec2( vUv.x, vUv.y + 3.0 * v ) ).r * 0.0918;",
						"d += texture2D( texture, vec2( vUv.x, vUv.y + 4.0 * v ) ).r * 0.051;",
						*/
						'gl_FragColor = vec4(dage * d * col.xyz,d * col.w);',
					
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
		obj.immediateClearCountryColors = immediateClearCountryColors;
		obj.applyDatGuiControlConfiguration = applyDatGuiControlConfiguration;
		obj.switchCountryColorSet = switchCountryColorSet;
		obj.setHoverCountry = setHoverCountry;
		obj.stop = stop;
		obj.start = start;
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
		obj.setCountryLightning = setCountryLightning;
		obj.getCountryLightning = getCountryLightning;
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
}
