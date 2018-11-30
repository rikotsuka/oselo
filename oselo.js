phina.globalize();

var NONE  =   0;
var BLACK =   1;
var WHITE =   2;
var END_TYPE = {
  NORMAL:1,
  COLOR: 2,
  PASS:3,
};

var OPTIONS = null;

phina.main(function() {
  var app = GameApp(OPTIONS = {
    startLabel: 'main',
    title: 'オセロ',
  });
  
  app.run();
});

Label.defaults.$extend({
    fontFamily: 'Verdana, Arial, "游ゴシック","Yu Gothic","游ゴシック体","YuGothic","ヒラギノ角ゴ Pro W3","Hiragino Kaku Gothic Pro", "Hiragino Kaku Gothic ProN","Meiryo UI","メイリオ",Meiryo, sans-serif',
});

phina.define('MainScene', {
  superClass: 'DisplayScene',
  
  init: function(o) {
    this.superInit(o);
    var self = OPTIONS.scene = this;
    this.backgroundColor = "rgba(164, 128 ,64, 0.5)";
    var labelOpt = {
      fontSize:40,
      color:'black',
      text:'',
    };
    var gx = this.gridX;
    var gy = this.gridY;
    
    var boardLayer = DisplayElement().addChildTo(this);
    var labelLayer = this.labelLayer = DisplayElement().addChildTo(this);
    
    this.blackLabel = Label({
      x:gx.span(1),
      align:'left',
      text:2
    }.$safe(labelOpt)).addChildTo(Label({
      x:gx.span(1),
      y:gy.span(1),
      text:'黒:'
    }.$safe(labelOpt)).addChildTo(labelLayer));
    
    this.whiteLabel = Label({
      x:gx.span(1),
      align:'left',
      text:2
    }.$safe(labelOpt)).addChildTo(Label({
      x:gx.center(1),
      y:gy.span(1),
      text:'白:'
    }.$safe(labelOpt)).addChildTo(labelLayer));
    
    
    var board = this.board = Board().addChildTo(boardLayer);
    board.onput = function(e){
      if(self.lastAlert)self.lastAlert.remove();
      var p = e.piece;
      if(this.isPutable(p, function(e){
        var message = {
          isNotReversable: 'そこに置いても\n ひっくり返すことができないので、\n 置くことはできない!',
          exists: 'そこにはすでに置いてあるぞ!',
        };
        self.showMessage(message[e.type]);
      })){
        this.put(p);
      }
    };
    
    board.onchange = function(e){
      self.showMessage((e.isPlayingBlack ? '黒' : '白') + 'の番です。');
    };
    
    board.onpass = function(){
      self.showAlert('置くところがない!\nパスだ!');
    };
    
    board.onend = function(e){
      var t = this.end;
      var count = this.count();
      function end(){
        self.exit({
          endType: t,
          score: "黒: "+count.black + "\n白: "+count.white,
          message: 'phina.js オセロ',
          hashtags: 'phina_js,game,javascript,runstant',
          url: "http://runstant.com/simiraaaa/projects/phina_js_othello/full",
        });
      }
      if(t === END_TYPE.NORMAL){
        self.showAlert('終了!', end);
      }else if(t === END_TYPE.COLOR){
        self.showAlert('全て同じ色になったので、\n 終了!',end);
      }else {
        self.showAlert('両者、\n 置くことができないので、\n 終了!',end);
      }
    };
    
    board.onreversed = function(e){
      this.next();
    };
    
  },
  
  showMessage: function(message){
    var self = this;
    if(this.lastLabel)Tweener().attachTo(this.lastLabel).to({
      y: this.gridY.span(15),
    }, 600, 'swing');
    
    var l= this.lastLabel = Label({
      text: message,
    }).addChildTo(this.labelLayer)
    .setPosition(this.gridX.span(16), this.gridY.span(12.5))
    .setScale(2,1.5);
    
    l.tweener.to({
      x: this.gridX.center(),
      scaleX: 1,
      scaleY: 1,
    },300, 'easeOutBack').wait(1000).to({
      x: -l.x,
      scaleX:2,
      scaleY:1.5,
    }, 300,'easeInBack').call(function(){
      l.remove();
    });
  },
  
  showAlert: function(message, func){
    if(this.lastAlert){
      this.lastAlert.remove();
    }
    var gx = this.gridX;
    var gy = this.gridY;
    var a = this.lastAlert = Label({
      text: message,
      x: gx.center(),
      y: gy.center(-1),
      fontSize: 40,
      strokeWidth:8,
      stroke: 'black',
      fill: 'white',
    }).addChildTo(this);
    
    a.tweener.wait(2000).to({
      alpha: 0,
    }).call(function(){
      this.target.remove();
      func && func();
    });
    
  },
  
  update: function(app){
    var score = this.board.count();
    this.whiteLabel.text = score.white;
    this.blackLabel.text = score.black;
  }
});


phina.define('Board',{
  superClass: DisplayElement,
  
  _static: {
    arrayNames: [
      'pieces',
      'directions',
      'reversables'
    ]
  },
  
  isReversable: false,
  isPlayingBlack: false,
  end:false,
  length: 8,
  init:function(opt){
    this.superInit(opt);
    Board.arrayNames.forEach(function(a){
      this[a] = [];
    }, this);
    this.initBoard();
    this.updateGame();
  },
  
  update: function(app){
    
  },
  
  
  put: function(p){
    if(this.isWaiting || this.end)return this;
    this.isWaiting = true;
    p.color = this.getColor();
    var vec2 = p.getGridPosition();
    return this
      .setDirections(vec2)
      .setReversables()
      .setStack()
      .setColor(this.pieces.flatten(), NONE);
  },
  
  setStack: function(){
    var tweener = this.tweener.clear();
    this.reversables.forEach(function(a){
      a.forEach(function(p){
        tweener.wait(30).call(function(){
          p.reverse();
        });
      });
    });
    tweener.wait(300).call(function(){
      this.target.flare('reversed');
      this.target.isWaiting = false;
    });
    return this;
  },
  
  setColor: function(arr, color){
    arr.forEach(function(p){
      p.setColorToChildren(color);
    });
    return this;
  },

  updateGame: function(){
    
    if(this.checkEnd()){
      return this;
    }
    var color = this.getColor();
    this.setColor(this.putables, color);
    
  },
  checkEnd: function(){
    if(this.end)return true;
    this.putables = this.getPutables().flatten();
    
    var score = this.count();
    if(score.black + score.white >= this.length * this.length){
      this.end = END_TYPE.NORMAL;
      this.fire({
        type: 'end',
      });
      return true;
    }
    
    if(score.white === 0 || score.black === 0){
      this.end = END_TYPE.COLOR;
      this.fire({
        type: 'end',
      });
      return true;
    }
    this.isPlayingBlack = !this.isPlayingBlack;
    if(!this.putables.length && !this.isPutableAll()){
      this.end = END_TYPE.PASS;
      this.fire({
        type: 'end',
      });
      return true;
    }
    this.isPlayingBlack = !this.isPlayingBlack;
    return false;
  },
  
  changePlaying: function(){
    this.isPlayingBlack = !this.isPlayingBlack;
    this.fire({
      type: 'change',
      isPlayingBlack: this.isPlayingBlack,
    });
  },

  next: function(){
    if(this.checkEnd()){
      return this;
    }
    this.changePlaying();
    if(!this.isPutableAll()){
      this.fire({
        type: 'pass',
      });
      this.changePlaying();
    }
    this.updateGame();
  },
  
  getColor: function(){
    return this.isPlayingBlack ? BLACK : WHITE;
  },
  
  // 置けるか
  isPutable: function(p, f){
    if(this.end) return false;
    // おいてある
    if(p.color !== NONE){
      f && f({
        type: 'exists',
        piece: p,
      });
      return false;
    }
    
    // ひっくり返せるところがない
    if(!this.setDirections(p.getGridPosition()).setReversables().isReversable){
      f && f({
        type: 'isNotReversable',
        piece: p,
      });
      return false;
    }
    
    return true;
    
  },
  
  // 1箇所以上置けるか
  isPutableAll: function(f){
    return this.pieces.some(function(a){
      return a.some(function(p){
        return this.isPutable(p);
      }, this);
    }, this);
  },
  
  getPutables: function(f){
    return this.pieces.map(function(a){
      return a.filter(function(p){
        return this.isPutable(p);
      }, this);
    }, this);
  },
  
  getPiece: function(vec2){
    return this.pieces[vec2.x][vec2.y];
  },
  
  /**
   * ひっくり返せるやつをセット
   */
  setReversables: function(){
    this.isReversable = false;
    var da = this.directions;
    var re = this.reversables;
    var color = this.isPlayingBlack ? BLACK : WHITE;
    this.clearArray(re);
    var self = this;
    da.forEach(function(d, i){
      var status = false;
      var r = re[i];
      if(!d.some(function(p, j){
        var c = p.color;
        if(c === NONE){
          r.length = 0;
          return true;
        }
        if(c === color){
          if(status){
            self.isReversable = true;
          }
          return true;
        }else {
          status = true;
          r.push(p);
        }
      }) && status){
        r.length = 0;
      }
    });
    
    return this;
  },
  
  /**
   * 位置から、上下左右斜め八方向のpieceをセット
   */
  setDirections: function(vec2){
    var da = this.directions;
    this.clearArray(da);
    var ps = this.pieces;
    var flag = 0;
    var x = vec2.x;
    var y = vec2.y;
    var left = x - 1;
    var right = x + 1;
    var up = y - 1;
    var down = y + 1;
    var L = this.length;
    while(true){
      flag = 0;
      if(left >= 0){
        da[0].push(ps[left][y]);

        if(up >=0){
          da[4].push(ps[left][up]);
        }
        if(down < L){
          da[5].push(ps[left][down]);
        }
        
        --left;
        flag = 1;
      }
      if(right < L){
        da[1].push(ps[right][y]);
        
        if(up >=0){
          da[6].push(ps[right][up]);
        }
        if(down < L){
          da[7].push(ps[right][down]);
        }
        
        ++right;
        flag = 1;
      }
      
      if(up >=0){
        da[2].push(ps[x][up]);
        --up;
        flag = 1;
      }
      
      if(down < L){
        da[3].push(ps[x][down]);
        ++down;
        flag = 1;
      }
      
      if(!flag)return this;
    }
  },
  
  clearArray: function(arr){
    for(var i = 0;i < 8;++i){
      arr[i]=[];
    }
  },
  
  count: function(){
    var ps = this.pieces;
    var b=0,w=0;
    ps.forEach(function(e){
      e.forEach(function(p){
        if(p.color === NONE){
          return;
        }
        if(p.color === BLACK)++b;
        else ++w;
      });
    });
    return {
      black: b,
      white: w,
    };
  },
  
  initBoard: function(){
    
    var s = OPTIONS.scene;
    var gx = s.gridX;
    var gy = s.gridY;
    RectangleShape({
      width: gx.span(14),
      height: gx.span(14),
      x: gx.span(1),
      y: gy.span(2),
      fill: 'green',
      stroke: false,
      padding:0,
    }).setOrigin(0,0).addChildTo(this);
    
    (9).times(function(i){
      var x1 = gx.span(1);
      var x14 = gx.span(14);
      
      var y2 = gy.span(2);
      PathShape({
        x: i * x14 / 8 + x1,
        y: y2,
        stroke: 'black',
      }).addPath(0, 0).addPath(0,x14).addChildTo(this);
      
      PathShape({
        y: i * x14 / 8 + y2,
        x: x1,
        stroke: 'black',
      }).addPath(0, 0).addPath(x14, 0).addChildTo(this);
    }, this);
    
    this.clearPieces();
  },
  
  clearPieces: function(){
    var ps = this.pieces;
    var len = this.length;
    var self = this;
    var s = OPTIONS.scene;
    var gx = s.gridX;
    
    var x1 = gx.span(1);
    var x14 = gx.span(14);
    var y2 = s.gridY.span(2);
    
    
    len.times(function(i){
      ps[i] = [];
      len.times(function(j){
        var x = x14 / 8;
        ps[i][j] = Piece({
          y: j * x + x / 2 + y2,
          x: i * x14 / 8 + x1 + x / 2,
          i: i,
          j: j,
          color:NONE,
        }).addChildTo(self);
      });
    });
    
    ps[len/2|0][len/2|0].color = BLACK;
    ps[(len/2|0) - 1][(len/2|0)-1].color = BLACK;
    ps[(len/2|0) - 1][(len/2|0)].color = WHITE;
    ps[(len/2|0)][(len/2|0)-1].color = WHITE;
  },
  
});

phina.define('Piece', {
  superClass: CircleShape,
  
  init: function(opt){
    this.superInit({
      stroke:false,
      fill: 'transparent',
      width: OPTIONS.scene.gridX.span(1) * 1.2,
      height: OPTIONS.scene.gridX.span(1) * 1.2,
    }.$safe(opt));
    this.color = NONE;
    if(typeof opt.color === 'number')this.setFillByNumber(opt.color);
    this.i = opt.i;
    this.j = opt.j;
    if(!opt.isDummy){
      this.setInteractive(true);
      Piece({isDummy:true}).addChildTo(this).tweener.to({
        alpha: 0.1,
      },600, 'swing').to({
        alpha:0.4
      },600,'swing').setLoop(true).target.alpha = 0;
    }
    this.setBoundingType('rect');
    
  },
  
  getGridPosition: function(){
    return Vector2(this.i, this.j);
  },
  
  onpointend : function(){
    console.log(this.i,this.j);
    if(this.parent)this.parent.fire({
      type:'put',
      piece: this,
    });
  },
  
  setFillByNumber : function(color){
    this.fill = color === NONE ? 'transparent': (color === BLACK ? 'black' : 'white');
    this._color = color;
    return this;
  },
  
  setColorToChildren: function(color){
    this.children.forEach(function(c){c.setFillByNumber(color);});
  },
  
  reverse: function(){
    if(this.color === NONE){
      return;
    }
    this.tweener.clear().to({
      scaleX:0,
    }, 130, 'easeOutQuad').set({
      color: this.color === BLACK ? WHITE: BLACK,
    }).to({
      scaleX:1,
    }, 130, 'easeInQuad');
    
    return this;
  },
  
  _defined : function(){
    Shape.watchRenderProperty.call(this,'color');
  },
  
  _accessor: {
    color :{
      get : function(){return this._color;},
      set: function(c){this.setFillByNumber(c);},
    },
  }
  
});