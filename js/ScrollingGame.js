/** SSS.ScrollingGame.js

	http://lee/ScrollingGame/

	TODO

	Reverse direction

	As the number of surviving aliens decreases, they should home-in on the player

	Landscape could be randomised.

	Add a heads-up display of the whole landscape

	Little man hits the ground and dies

**/

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
		  window.webkitRequestAnimationFrame ||
		  window.mozRequestAnimationFrame    ||
		  window.oRequestAnimationFrame      ||
		  window.msRequestAnimationFrame     ||
		  function( callback ){
			window.setTimeout(callback, 1000 / 60);
		  };
})();

var Trig = {
    distanceBetween2Points: function ( point1, point2 ) {
        var dx = point2[0] - point1[0];
        var dy = point2[1] - point1[1];
        return Math.sqrt( Math.pow( dx, 2 ) + Math.pow( dy, 2 ) );
    },

    angleBetween2Points: function ( point1, point2 ) {
        var dx = point2[0] - point1[0];
        var dy = point2[1] - point1[1];
        return Math.atan2( dx, dy );
    }
}

// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
Math.UUIDv4 = function b(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b)}

var SSS = SSS || {};

SSS.ScrollingGame = new Class({
	Implements: [Options],

	options: {
		totalAliens:				4, // 2,
		randomiseAlien:		100,
		randomiseAlienDecrease: 0.5, // per frame
		bombDelayMS:				400,
		bombRand:				10,
		alienMoveXFactor:		.5,
		alienMoveYFactor:		.2,
		element: 				null,	// DOM element into which to insert this app
		canvasWidth:				700,		// Size of the canvas for its
		canvasHeight:			500,		// Attributes and CSS.
		scrollPx:				4,
		landHeight:				50,		// Maximum height people can be placed
		speedUpBy:				1,
		maxSimShots:				8,
	},

	level:			1,
	score:			0,
	killedThisLevel: 0,
	x:				null,		// Mouse position
	y:				null,		// Mouse position
	canvas:			null,		// The canvas this code creates
	ctx:				null,		// Canvas context
	anchor:			null,		// Cursor offset relative to canvas
	element:			null,		// Inst from options.element
	direction:		-1,
	screenX:			0,
	mapIndex:		0,
	extraWidth: 		200,
	landClr:			null,
	collided:		false,
	aliens:			[],			// Instances of Alien
	shotsFiring:		[],			// Shots currently in the air
	landWidth:		0,
    alienTargetTimer: null,		// timeout

    	landColours:	[
    		'100,130,100',
    		'255,130,171',
    		'200,130,100',
    		'255,131,250',
    		'145,44 	238',
    		'84,255,159	',
    		'238,201,0',
    		'255,48,48',
    	],

    map: [
		[100, 100],
		[100, 100],
		[100, 100],
		[100, 100],
		[200, 100],
		[100, 100],
		[100,  50],
		[100,  50],
		[100, 100],
		[100, 100],
		[200, 200],
		[200, 100],
		[200, 100],
		[200, 200],
		[200, 350],
		[200, 100],
		[200, 100],
		[200, 200],
		[200, 200],
		[200, 50],
		[200, 300],
		[100, 200],
		[150, 300],
		[100, 200],
		[100, 400],
		[ 40, 400],
		[100, 350],
		[100, 300]
	],

	initialize: function( options ){
		var self = this;
		this.setOptions(options);

		this.makeGUI();
		this.anchor = this.canvas.getPosition();
		this.ctx		= this.canvas.getContext('2d');

		this.init();
		this.initEvents();
	},

	init: function(){
		var self = this;
		this.score = parseInt( Cookie.read('score')) || 0;
		this.level = parseInt( Cookie.read('level')) || 1;
		this.options.totalAliens += this.level;
		this.landColour = this.landColours[
			this.level % this.landColours.length
		];

		// Settings we can make based on the map:
		this.map.each( function(i){
			this.landWidth += i[0];
			if (i[0] > this.extraWidth)
				this.extraWidth = i[0]; // thrice  the longest stretch
			if (i[0] < this.options.landHeight)
				i[0] = this.options.landHeight;
		}, this);

		for (var i=0; i < this.options.totalAliens; i++){
			this.aliens.push( new SSS.ScrollingGame.Alien({
				landWidth:	  this.landWidth,
				landHeight:	  this.canvas.height,
				canvasWidth:	  this.canvas.width,
				canvasHeight: this.canvas.height,
				scrollPx:	  this.options.scrollPx,
				direction:	  this.direction,
				baseDir: 		'./img/cameron/',
				bombDelayMS:		40,
				bombRand:		30,
				randomiseAlien:			this.options.randomiseAlien,
				randomiseAlienDecrease:	this.options.randomiseAlienDecrease

			}, this.ctx).start() );
		}

		this.player = new SSS.ScrollingGame.Player({
			totalImgs:		1,
			canvasHeight:	this.canvas.height,
			landWidth:		this.landWidth,
			landHeight: 		this.options.landHeight,
			baseDir:			'./img/player/',
			ext:				'png',
			scrollPx:		this.options.scrollPx,
			direction:		this.direction,
			onDeath:			function(){
				self.renderLand();
				self.destroy();
				self.gameOver('You have crashed!');
			}
		}, this.ctx).start(
			this.canvas.width/2,
			100
		);

		this.ctx.font = "20pt Helvetica";
	},

	speedUp: function(){
	//	if (this.direction > 0)
	//		this.direction += this.speedUpBy;
	//	else
	//		this.direction -= this.speedUpBy;
	},

	/* Add event listeners */
	initEvents: function() {
		var self = this;
		// React to movement of the mouse
		this.canvas.addEvent('mousemove', function(e){
			// Make co-ords absolute within canvas
			//self.x = e.page.x - self.anchor.x;
			//self.y = e.page.y - self.anchor.y;
			self.player.moveTo(
				e.page.x - self.anchor.x,
				e.page.y - self.anchor.y
			);
			e.stop();
		});

		window.addEvent('keydown', function(e){
			e.stop();
			switch(e.key){
				case 'up':
					self.player.moveBy(0,-10); // self.move(0, -1);
					break;
				case 'down':
					self.player.moveBy(0, 20); // self.move(0, 1);
					break;
				case 'left':
					self.player.moveBy(-10, 0);// self.move(-2, 0);
					break;
				case 'right':
					self.player.moveBy(5, 0); // self.move(1, 0);
					break;
				case 'space':
					self.fire(); // self.fire();
					break;
				case 'enter':
					self.direction = self.direction * -1;
			}
		});

		this.setAlienTarget(this.player);
		this.alienTargetTimer = this.setAlienTarget.periodical( 2000, this );

		// Schedule rendering:
		(function animloop(){
			if (self.player.playing){
				requestAnimFrame(animloop);
				self.tick();
			}
		})();
	},

	setAlienTarget: function(){
		this.aliens.each( function(alien){
			alien.setTarget(this.player);
		},this);
	},

	/* Kill the timers used for playing and rendering */
	destroy: function(){
		// this.canvas.fade('out');
		this.canvas.removeEvents('mousemove');
		window.removeEvents('keydown');
		this.player.playing = false;
	},

	youWin: function(){
		this.level ++;
		alert("You win!\n\Get ready for level "+this.level);
		Cookie.write('level', this.level);
		Cookie.write('score', this.score);
		document.location.reload()
	},

	gameOver: function(msg){
		Cookie.write('level', 1);
		Cookie.write('score', 0);
		alert(
			"G A M E  O V E R\n\n"+msg+"\n\n"
			+	 "You destroyed " + this.score+' of '+this.options.totalAliens
			+ " aliens on level " + this.level + "\n\n\n"
		);
		document.location.reload()
	},

	makeGUI: function(){
		this.element = document.id(this.options.element);
		this.ctrlsEl = document.id(this.options.xcontrolsElement);
		if (this.options.fillWindow){
			this.options.canvasWidth  = window.getSize().x;
			this.options.canvasHeight = 440; // window.getSize().y;
		}

		this.element.setStyle('position', 'relative');
		this.canvas = new Element('canvas', {
			'class': 'ScrollingGame',
			width: this.options.canvasWidth,		// parseInt(this.element.getStyle('width')),
			height: this.options.canvasHeight,	// parseInt(this.element.getStyle('height')),
			styles: {
				width:  this.options.canvasWidth+'px', // parseInt(this.element.getStyle('width'))   +'px',
				height: this.options.canvasHeight+'px'  // parseInt(this.element.getStyle('height')) +'px'
			}
		});
		this.element.adopt( this.canvas );
	},

	tick: function(){
		this.scroll();
		this.moveAliens();
		this.renderLand();
		this.renderAliens();
		this.player.collisionDetection();
		this.renderFire();
		this.player.render( this.direction );
	},

	scroll: function(){
		this.screenX += this.options.scrollPx * this.direction;
	},

	renderLand: function(){
		// Wipe canvas
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Init drawing
		this.ctx.beginPath();
		this.ctx.lineWidth = 4;
		this.ctx.strokeStyle = 'rgba('+this.landColour+',0.9)';
		this.ctx.fillStyle = 'rgba('+this.landColour+',0.7)';

		if (this.direction > 0){
			if (this.screenX > Math.abs( this.map[ this.mapIndex ][0] )){
				this.screenX = 0;
			}
		}

		// Init rendering cursor at the scoll position
		var x = this.screenX;
		var mi = this.mapIndex;
		var y = this.canvas.height - this.map[ mi ][1];
		this.ctx.beginPath();
		this.ctx.moveTo( x, y );

		while (x < this.canvas.width + this.extraWidth){
			this.ctx.lineTo( x, y );
			y = this.canvas.height - this.map[ mi ][1];
			x += this.map[ mi ][0];
			mi += 1
			if (mi >= this.map.length){
				this.mapIndex = mi = 0;
			}
			else if (mi <= 0) {
				this.mapIndex = mi = this.map.length -1;
			}
		}

		// Complete the line for fill
		this.ctx.lineTo(x, y);
		this.ctx.lineTo(x, this.canvas.height);
		this.ctx.lineTo(0, this.canvas.height);
		this.ctx.closePath();
		this.ctx.stroke();
		this.ctx.fill();

		this.ctx.fillStyle = 'white';
		this.ctx.fillText(
			'Level '+this.level+' '
			+'Score '+this.score,
			10,
			this.canvas.height - 20
		);
	},

	renderFire: function(){
		this.shotsFiring.each( function(i){
			i.render();
		}, this);
	},

	renderAliens: function(){
		this.aliens.each( function(i){
			i.render();
		}, this);
	},

	moveAliens: function(){
		this.aliens.each( function( al ){
			if (! al.alive) return;
			var angle = Trig.angleBetween2Points(
				[al.x, al.y],
				al.target
			);
			// mx = Math.sin(angle) * this.options.scrollPx * (-1* this.direction);
			mx = this.options.scrollPx * this.direction;
			my = Math.cos(angle) * this.options.scrollPx
			al.moveBy( mx, my);
		}, this);
	},

	fire: function(){
		var self = this;
		if (this.shotsFiring.length >= this.options.maxSimShots) return;

		var fire = new SSS.ScrollingGame.Fire(
			{
				direction: this.direction,
				x: this.player.x + this.player.width,
				y: this.player.y - this.player.height/2 +10,
				direction: this.direction > 0? -1 : 1,
				onHit: function(){
					self.score ++;
					self.killedThisLevel ++;
					if (self.killedThisLevel == self.options.totalAliens){
						self.explosion = new SSS.ScrollingGame.Explosion({}, self.ctx )
						.start(
							self.player.x - (self.options.width/2),
							self.player.y + (self.options.height/2)
						);
						self.youWin();
						self.destroy();
					}
				},
				onComplete: function(){
					var newFire = [];
					self.shotsFiring.each( function(i){
						if (i.alive) newFire.push( i );
					});
					self.shotsFiring = newFire;
				},
			},
			this.ctx,
			this.aliens
		);
		this.shotsFiring.push(fire);
	}
});



/* If no width or height is specified, that of the largest image is used */
SSS.ScrollingGame.Sprite = new Class({
	Implements: [Options],
	options: {
		baseDir: 	null, // './img/explosion/',
		totalImgs: 	null, // 17,
		ext: 		null, // 'gif',
		frameRate: 	40,
		onFrame: 	function(){},
		onComplete: function(){},
		width: 		null,
		height: 		null,
		scrollPx: 	0,		// added to x each itteration
		lopp:		true,  // alien does, explosion does not
	},

	width:	0,
	height:	0,
	frame:	0,
	loaded: false,
	loadedImgs: 0,
	loop:	false,
	timer:	null,
	imgs:	[],
	ctx:		null,
	x:		null,
	y:		null,
	alive:	true,
	uid:		null,

	initialize: function( options, ctx ){
		var self = this;
		this.ctx = ctx;
		this.setOptions(options);
		this.uid = Math.UUIDv4();
		this.scrollPx = this.options.scrollPx;

		if (!this.className){
			alert('No className');
		}

		if (this.options.width) this.width = this.options.width;
		if (this.options.height) this.height = this.options.height;

		if (!this.options.totalImgs) this.options.totalImgs = 1;

		for (var i=1; i <= this.options.totalImgs; i++){
			var img = new Image();
			img.src = this.options.baseDir + '/'+i+'.'+this.options.ext;
			img.addEvent('load', function(){
				self.loadedImgs++;
				if (self.loadedImgs == self.options.totalImgs) self.loaded = true;
				if (! self.options.width && img.width > self.width)
					self.width = img.width;
				if (! self.options.height && img.height > self.height)
					self.height = img.height;
			});
			this.imgs.push( img );
		}
		if (this.options.totalImgs==1) this.loop = true;
	},

	start: function( x,y, useTimer ){
		if (x) this.x = x;
		if (y) this.y = y;
		useTimer = useTimer || this.useTimer || false;
		this.frame = 0;
		if (this.timer) clearInterval( this.timer );
		this.render();
		if (useTimer) this.timer = this.render.periodical( this.options.frameRate, this );
		return this;
	},

	destroy: function(){
		if (this.timer) clearInterval( this.timer );
	},

	setScrollPx: function(n){
		this.scrollPx = n;
	},

	render: function(){
		if (!this.loaded) return;
		this.options.onFrame();
		this.ctx.drawImage(
			this.imgs[ this.frame ],
			this.x - (this.width /2),
			this.y - (this.height/2)
		);
		if (++this.frame == this.imgs.length){
			if (this.loop){
				this.frame = 0
			}
			else {
				this.alive = false;
				if (this.timer) clearInterval( this.timer );
				this.options.onComplete();
			}
		}
	},

	moveBy: function(mx,my){
		return this.moveTo( this.x+mx, this.y+my);
	},

	/* Move, wrap the alien onto the landscape,
	   and update fields used in collision detection.
	   The direction fields are currently unused. */
	moveTo: function(x,y){
		this.x = x;
		this.y = y;
		if (this.x > this.options.landWidth) this.x = 0; // - extraWidth
		else if (this.x+this.width < 0) {
			this.x = this.options.landWidth - this.width;
		}

		if (this.y >= this.options.canvasHeight){
			this.y = this.options.canvasHeight - 1;
			this.directionY = this.directionY * -1;
		}
		else if (this.y < 0) {
			this.y = 1;
			this.directionY = this.directionY * -1;
		}

		this.yMin = this.y - (this.options.height/2);
		this.yMax = this.y + (this.options.height/2);
	}
});



SSS.ScrollingGame.Explosion = new Class({
	Extends: SSS.ScrollingGame.Sprite,
	Implements: [Options],
	options: {
		baseDir: 	'./img/explosion/',
		totalImgs: 	17,
		ext: 		'gif',
		frameRate: 	40,
		onFrame: 	function(){},
		onComplete: function(){},
		width: 		71,
		height: 		100,
	},
	className: 'Explosion'
});


SSS.ScrollingGame.Alien = new Class({
	Extends: SSS.ScrollingGame.Sprite,
	Implements: [Options],
	options: {
		canvasWidth:		null,
		canvasHeight:	null,
		landWidth:		null,
		landHeight:		null,
		moveXby:			1,
		moveYby:			2,
		directionY:		-1,
		directionX:		-1,
		scrollPx:		0,
		width:			20,
		height:			20,
		baseDir: 		'./img/cameron/',
		ext:				'png',
		bombDelayMS:		40,
		bombRand:		30,
		randomiseAlienDecrease: .5,
		randomiseAlien: 400,
	},

	className:		'alien',
	alive:			true,
	x: 				-10,
	y: 				-10,
	yMin:			null,
	yMax:			null,
	moveXby:			null,
	moveYby:			null,
	directionX:		null,
	directionY:		null,
	landX:			0,
	startTime:		0,
	lastBomb:		new Date().getTime(),
	bomb:			null,
	target:			[],

	initialize: function( options, ctx ){
		this.setOptions(options);
		this.ctx = ctx;
		this.parent(options, ctx);
		this.uid = Math.UUIDv4();
		this.x =  this.options.canvasWidth + Math.floor((Math.random()*this.options.canvasWidth/3)+1);
		// Spawn in the top bit of the screen
		this.y =  Math.floor((Math.random()*this.options.canvasHeight)+1);
		// console.log( this.x + ' '+this.options.canvasWidth);
		this.moveXby = this.options.moveXby;
		this.moveYby = this.options.moveYby;
		this.directionX = this.options.directionX;
		this.directionY = this.options.directionY;
		this.startTime = new Date().getTime();
	},

	moveTo: function(x,y){
		if (x+this.width<0){
			x = this.options.canvasWidth;
		}
		this.parent(x,y);
	},

	setTarget: function(player){
		this.options.randomiseAlien -= this.options.randomiseAlienDecrease;
		if (this.options.randomiseAlien < 10) this.options.randomiseAlien = 10;
		this.target = [
			player.x
				+(Math.random()*this.options.randomiseAlien)+1
				+(this.options.randomiseAlien/2),
			player.y
				+(Math.random()*this.options.randomiseAlien)+1
				+(this.options.randomiseAlien/2)
		];
		// console.log( 'Alien Target: '+this.target[0]+','+this.target[1]+' ... x,y: '+player.x+','+player.y );
	},

	// Alien hit by player
	die: function(){
		this.alive = false;
		clearInterval( this.alienTargetTimer );
		// Create an explosion to use instead of the alien sprite
		this.explosion = new SSS.ScrollingGame.Explosion({}, this.ctx );
		this.explosion.start(
			this.x - (this.width/2),
			this.y + (this.height/2)
		);
	},

	render: function(){
		if (this.alive == false) {
			// If alien is dying, render an explosion
			if (this.explosion){
				if (this.explosion.alive) this.explosion.render();
				else delete this.explosion;
			}
			// If alien had an abuductee, render it
			return;
		}

		// Only render if on screen
		if (this.x < 0 || this.y < 0
		 || this.x > this.options.canvasWidth
	 	 || this.y > this.options.cavnasHeight
	 	) return;

	 	// Perhaps bomb?
	 	if (this.bomb == null){
			if ( this.x > 0 && this.x < this.canvasWidth
			&& Math.floor((Math.random()*this.options.bombRand)+1) > this.options.bombRand-1
			){
				var now = new Date().getTime();
				if (now - this.lastBomb > this.options.bombDelayMS){
					this.lastBomb = now;
					// console.log( 'bomb @ '+this.x+','+this.y);
					var self = this;
					this.bomb = new SSS.ScrollingGame.Bomb({
						scrollPx: this.options.scrollPx,
						direction: this.options.directionX,
						onComplete: function(){
							self.bomb = null;
						}
					}, this.ctx)
					.start(
						this.x, this.y
					);
				}
			}
		}
		// Bombing in progress
		else {
			this.bomb.render();
		}
	 	return this.parent();
	}
});


SSS.ScrollingGame.Fire = new Class({
	Implements: [Options],
	options: {
		direction:	null,
		frameRate: 	1000/60,
		onFrame: 	function(){},
		onComplete: function(){},
		width: 		200,
		height: 		2,
		moveX:		4,
		direction:	null,
	},

	aliens:	[],
	ctx:		null,
	frame:	0,
	totalFrames: 50,
	timer:	null,
	ctx:		null,
	fromX:	null,
	toX:		null,
	alive:	true,

	initialize: function( options, ctx, aliens ){
		this.setOptions(options);
		this.ctx			= ctx;
		this.aliens		= aliens;
		this.fromX		= this.options.x;
		this.toX			= this.options.x + (
			this.options.width * this.options.direction
		);
		if (this.timer) clearInterval( this.timer );
		this.render();
	},

	destroy: function(){
		this.alive = false;
		clearInterval( this.timer );
	},

	render: function(){
		if (this.alive == false)  return;
		this.options.onFrame();

		this.collisionDetection();
		if (this.collided){
			this.frame = this.totalFrames; // quit
		}

		else {
			this.ctx.lineWidth = this.options.height;
			var u = 4 * this.options.direction;	// Number of units into which to split laser fire
			var alphaUnit = 1 / (this.options.width / u);
			this.ctx.strokeStyle = 'gold';
			this.ctx.globalAlpha = 0;
			for (px=this.fromX;
				(this.fromX < this.toX)? (px <= this.toX) : (this.toX <= px);
				px+=u
			){
				this.ctx.beginPath();
				this.ctx.globalAlpha += (alphaUnit * this.options.direction);
				this.ctx.moveTo( px, this.options.y );
				this.ctx.lineTo( px+u, this.options.y );
				this.ctx.stroke();
				this.ctx.closePath();
			}
			this.ctx.globalAlpha = 1;

			this.fromX += (this.options.moveX * this.options.direction);
			this.toX   += (this.options.moveX * this.options.direction);
		}

		if (++this.frame >= this.totalFrames){
			this.destroy();
			this.options.onComplete();
		}
	},

	collisionDetection: function(){
		this.aliens.each( function(al){
			if (al.alive
				&& al.yMin <= this.options.y
				&& al.yMax >= this.options.y
			){
				var die = false;
				if (this.fromX < this.toX){
					if (al.x >= this.fromX
						 && al.x <= this.toX
					){
						die = true;
					}
				} else {
					if (al.x >= this.toX
						 && al.x <= this.fromX
					){
						die = true;
					}
				}
				if (die){
					al.die();
					this.alive = false; // stop our shot
					this.options.onHit(this);
				}
		 	} // if alive
		}, this);
	}
});


SSS.ScrollingGame.Player = new Class({
	Extends: SSS.ScrollingGame.Sprite,
	Implements: [Options],
	options: { },

	className:	'player',
	playing:		true,

	initialize: function( options, ctx ){
		var self = this;
		this.ctx = ctx;
		this.setOptions(options);
		this.parent(options,ctx);
		this.explosion = new SSS.ScrollingGame.Explosion({
			// onFrame: function(){ self.renderLand() },
			onComplete: function(){
				self.options.onDeath();
			},
		}, this.ctx);
	},

	collisionDetection: function(){
		if (!this.loaded) return;
		if (this.collided) return;

		var imgd = this.ctx.getImageData(
			this.x, this.y, 1, 1
	//		this.x - (this.width/2),  this.y - (this.height/2),
	//		this.width, this.height
		).data;

		/*
		// Pixel-reading for collision detection - prior to drawing player,
		// or the player sprite would be a collision:
		var imgd = this.ctx.getImageData(
			this.x, this.y, 1, 1
		//	this.x - (this.width/2),  this.y - (this.height/2),
		//	this.width, this.height
		).data;

		// rgba
		this.collided = imgd[3] > 200;
		*/

		/* / Detect non-black
		var clrHit = 0;
		for (var i=0; (!this.collided) && i<imgd.length; i+=3){
			for (var j=0; j<3; j++){
				if (imgd[i+j] != 0) { // this.options.landRgb[i]){
					clrHit ++;
				}
				if (clrHit==3) this.collided = true;
			}
		}
		*/

		// * detect non alpha
		for (var i=3; (!this.collided) && i<imgd.length; i+=3){
			if (imgd[i] > 100){
				this.collided = true;
			}
		}

		return this.collided;
	},

	render: function(direction){
		// Alive
		if (this.collided){
			this.playing = false	;
			this.explosion.start( this.x, this.y, true ); // useTimer
		}

		else {
			this.parent();
		}
	}
});


SSS.ScrollingGame.Bomb = new Class({
	Extends: SSS.ScrollingGame.Sprite,
	Implements: [Options],
	options: {
		totalImgs: 	0,
		frameRate: 	1000/60,
		onFrame: 	function(){},
		onComplete: function(){},
		radius: 		10,
		points:		8,
		growBy:		20,
		pointSize:	5,
		totalFrames: 100,
		scrollPx:	null,
		direction:	null
	},
	className:	'bomb',
	radius:		null,
	time:		0,

	initialize: function( options, ctx ){
		this.setOptions(options);
		this.ctx	 = ctx;
		this.edgeSteps = 2 * Math.PI / this.options.points;
		this.radius = this.options.radius;
		this.time = new Date().getTime();
		this.render();
	},

	render: function(){
		if (this.alive == false)  return;

		this.options.onFrame();
		this.ctx.fillStyle = 'white';
		var pos = 0;
		for (var i=0; i<this.options.points; i++){
			pos += this.edgeSteps;
			var px = this.x - (this.options.pointSize/2) + ( this.radius * Math.sin( i ) );
			var py = this.y - (this.options.pointSize/2) + ( this.radius * Math.cos( i ) );
			this.ctx.beginPath();
			this.ctx.moveTo( px, py);
			this.ctx.arc(
				px, py,
				this.options.pointSize,
				0,	 2*Math.PI
			);
			this.ctx.fill();
			this.ctx.stroke();
			this.ctx.closePath();
		}

		if (++this.frame >= this.options.totalFrames){
			this.options.onComplete();
			this.destroy();
		}

		else {
			this.x += this.options.scrollPx * this.options.direction;
			var now = new Date().getTime();
			if (now - this.time >= this.options.frameRate){
				this.time = now;
				this.radius += this.options.growBy;
			}
		}
	}
});


// EOF

