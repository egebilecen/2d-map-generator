//Requires NodeJS.
//Ported from pure JS to NodeJS.

//run this if you will create bigger tile map:
//node --max-old-space-size=RAM_AMOUNT --max-stack-size=STACK_AMOUNT tilemap_generator.js

const fs       = require("fs");
const readline = require("readline-sync");
const probe    = require("probe-image-size");
const events   = require("events");
const eventEmitter = new events.EventEmitter();

//defines
const EOL = "\n"; 

function print(text){
    if(typeof text === "undefined")
        console.log("\n");
    else
        console.log(text);
}

function array_shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function random_int(min, max){
    return Math.floor(Math.random() * max) + min;
}

function isNegative(num){
    return num < 0;
}

function distance_between_two_coords(coord1, coord2){
    return Math.sqrt(
        Math.pow(coord2.x - coord1.x, 2) + Math.pow(coord2.y - coord1.y,2)
    );
}

Array.prototype.getRandomElement = function(){
    var arr  = this;
    var rand = Math.floor(Math.random() * arr.length);
    
    return arr[rand];
}


var TILEMAP_GENERATOR = {
    info : {
        status : 0,
        tileset : {
            loaded : 0,
            xml_text : "",
            last_gid : 0
        },
        tile : {
            width : 0,
            height: 0
        },
        config : null,
        map : {
            xml_text : ""
        }
    },
    xml_string : {
        layer : "<layer name='$layer_name' width='$map_width' height='$map_height'>\n" +
                    "<data encoding='csv'>\n" +
                        "$layer_array"+
                    "</data>\n"+
                "</layer>",
        tileset :"<tileset firstgid='$tileset_firstgid' name='$tileset_name' tilewidth='$tile_width' tileheight='$tile_height' tilecount='$tile_count' columns='$tileset_cols'>\n" +
                    "<image source='$tileset_source' trans='ff00ff' width='$image_width' height='$image_height'/>\n" +
                "</tileset>",
        map : "<?xml version='1.0' encoding='UTF-8'?>\n" +
                "<map version='1.0' tiledversion='2018.04.18' orientation='$draw_style' renderorder='left-up' width='$map_width' height='$map_height' tilewidth='$tile_width' tileheight='$tile_height' infinite='0' nextobjectid='1'>\n" +
                    "$tileset_xml\n" +
                    "$layer_xml\n"+
                "</map>\n"
    },
    findTilesetFromName : function(tileset_name){
        for(var i=0; i < TILEMAP_GENERATOR.info.config.tilesets.length; i++)
        {
            var tileset = TILEMAP_GENERATOR.info.config.tilesets[i];
            
            if(tileset.name === tileset_name)
                return tileset;
        }

        return false;
    },
    findTileId : function(tile, firstGid){
        var tileset = TILEMAP_GENERATOR.findTilesetFromName(tile.tileset);

        var row     = tileset.img.height / TILEMAP_GENERATOR.info.tile.height;
        var col     = tileset.img.width  / TILEMAP_GENERATOR.info.tile.width;

        var tileId  = tile.position.x + (tile.position.y * col) + firstGid;

        return tileId;
    },
    generateRandomPoint : function(amount, map_width, map_height){
        var generatedPoints = [];
        
        for(var i=0; i < amount; i++)
        {
            var exists = false;
            var pt = {
                x : random_int(0, map_width-1),
                y : random_int(0, map_height-1)
            };

            for(var j=0; j < generatedPoints.length; j++)
            {
                var ps = generatedPoints[j];

                if(ps.x === pt.x && ps.y === pt.y)
                    exists = true;
            }

            if(!exists)
                generatedPoints.push(pt);
        }

        return generatedPoints;
    },
    reset : function(){
        TILEMAP_GENERATOR.info.status = 0;
        TILEMAP_GENERATOR.info.tileset.xml_text = "";
        TILEMAP_GENERATOR.info.map.xml_text = "";
        TILEMAP_GENERATOR.info.tileset.loaded = [];
        TILEMAP_GENERATOR.info.config = null;
    },
    init : function(config_file, tile_width, tile_height){
        TILEMAP_GENERATOR.reset();

        //set variables
        TILEMAP_GENERATOR.info.tile.width   = tile_width;
        TILEMAP_GENERATOR.info.tile.height  = tile_height;

        //load config file
        fs.readFile("./"+config_file, "utf8", function(err, config){
            if(err)
            {
                return print("[!] - Error while loading config file: "+config_file+".");
            }
            else
            {
                config = JSON.parse(config);
                TILEMAP_GENERATOR.info.config = config;

                //load tilesets
                for(var i=0; i < config.tilesets.length; i++)
                {
                    var tileset = config.tilesets[i];
                    
                    var img_sync = fs.readFileSync(config.tileset_location+tileset.src);
                    var img_res  = probe.sync(img_sync);

                    TILEMAP_GENERATOR.info.tileset.loaded++;

                    var img = {
                        width  : img_res.width,
                        height : img_res.height,
                        full_path     : config.tileset_location+tileset.src,
                        tileset_index : i
                    };

                    TILEMAP_GENERATOR.info.config.tilesets[i].img = img;

                    var firstGid = TILEMAP_GENERATOR.info.tileset.last_gid + 1;

                    var r = Math.floor(img.width / TILEMAP_GENERATOR.info.tile.width);
                    var c = Math.floor(img.height / TILEMAP_GENERATOR.info.tile.height);

                    TILEMAP_GENERATOR.info.config.tilesets[img.tileset_index].firstGid   = firstGid;
                    TILEMAP_GENERATOR.info.config.tilesets[img.tileset_index].totalTiles = r*c;

                    //set xml
                    var xml = TILEMAP_GENERATOR.xml_string.tileset;
                    xml     = xml.replace("$tileset_firstgid",firstGid)
                                .replace("$tileset_name", tileset.name)
                                .replace("$tile_width",  TILEMAP_GENERATOR.info.tile.width)
                                .replace("$tile_height", TILEMAP_GENERATOR.info.tile.height)
                                .replace("$tile_count", r*c)
                                .replace("$tileset_cols", r)
                                .replace("$tileset_source", img.full_path)
                                .replace("$image_width", img.width)
                                .replace("$image_height", img.height);
                    TILEMAP_GENERATOR.info.tileset.xml_text += xml;

                    //set last gid
                    TILEMAP_GENERATOR.info.tileset.last_gid = TILEMAP_GENERATOR.info.tileset.last_gid + (r*c);

                    if(TILEMAP_GENERATOR.info.tileset.loaded === TILEMAP_GENERATOR.info.config.tilesets.length)
                    {
                        console.log("[?] - All tilesets loaded.");
                        TILEMAP_GENERATOR.info.status = 1;
                        eventEmitter.emit("Tilesets_Loaded");
                    }
                }
            }
        });

        
    },
    getAroundTiles : function(tile_map, x, y) {
        var sides = {
            //upper sides
            up      : null,
            upLeft  : null,
            upRight : null,

            //bottom sides
            bottom      : null,
            bottomLeft  : null,
            bottomRight : null,

            left  : null,
            right : null,

            current : {
                tileId : tile_map[y][x],
                coords : {
                    x : x,
                    y : y
                }
            }
        };

        //up
        if(typeof tile_map[y-1] !== "undefined" && tile_map[y-1][x] !== "undefined")
        {
            sides.up = {
                tileId : null,
                coords : {}
            };
            sides.up.tileId   = tile_map[y-1][x];
            sides.up.coords.x = x;
            sides.up.coords.y = y-1;
        }

        //up left
        if(typeof tile_map[y-1] !== "undefined" && tile_map[y-1][x-1] !== "undefined")
        {
            sides.upLeft = {
                tileId : null,
                coords : {}
            };
            sides.upLeft.tileId = tile_map[y-1][x-1];
            sides.upLeft.coords.x = x-1;
            sides.upLeft.coords.y = y-1;
        }

        //up right
        if(typeof tile_map[y-1] !== "undefined" && tile_map[y-1][x+1] !== "undefined")
        {
            sides.upRight = {
                tileId : null,
                coords : {}
            };
            sides.upRight.tileId = tile_map[y-1][x+1];
            sides.upRight.coords.x = x+1;
            sides.upRight.coords.y = y-1;
        }

        //bottom
        if(typeof tile_map[y+1] !== "undefined" && tile_map[y+1][x] !== "undefined")
        {
            sides.bottom = {
                tileId : null,
                coords : {}
            };
            sides.bottom.tileId = tile_map[y+1][x];
            sides.bottom.coords.x = x;
            sides.bottom.coords.y = y+1;
        }

        //bottom left
        if(typeof tile_map[y+1] !== "undefined" && tile_map[y+1][x-1] !== "undefined")
        {
            sides.bottomLeft = {
                tileId : null,
                coords : {}
            };
            sides.bottomLeft.tileId = tile_map[y+1][x-1];
            sides.bottomLeft.coords.x = x-1;
            sides.bottomLeft.coords.y = y+1;
        }

        //bottom right
        if(typeof tile_map[y+1] !== "undefined" && tile_map[y+1][x+1] !== "undefined")
        {
            sides.bottomRight = {
                tileId : null,
                coords : {}
            };
            sides.bottomRight.tileId = tile_map[y+1][x+1];
            sides.bottomRight.coords.x = x+1;
            sides.bottomRight.coords.y = y+1;
        }

        //left
        if(typeof tile_map[y] !== "undefined" && tile_map[y][x-1] !== "undefined")
        {
            sides.left = {
                tileId : null,
                coords : {}
            };
            sides.left.tileId = tile_map[y][x-1];
            sides.left.coords.x = x-1;
            sides.left.coords.y = y;
        }

        //right
        if(typeof tile_map[y] !== "undefined" && tile_map[y][x+1] !== "undefined")
        {
            sides.right = {
                tileId : null,
                coords : {}
            };
            sides.right.tileId = tile_map[y][x+1];
            sides.right.coords.x = x+1;
            sides.right.coords.y = y;
        }

        return sides;
    },
    parsePoints : function(points, map_width, map_height){
        if(isNegative(points.x))
            points.x = (map_width-1)  + points.x;

        if(isNegative(points.y)) 
            points.y = (map_height-1) + points.y;

        return points;
    },
    isThereEmptyTile : function(tile_data, width, height){
        for(var y=0; y < height; y++)
        {
            for(var x=0; x < width; x++)
            {
                var tile = tile_data[y][x];

                if(tile === 0)
                    return {x:x, y:y};
            }
        }

        return false;
    },
    findNearestTile : function(x, y, biome_points){
        var temp = {tile:null, dist:0};
        for(var i=0; i < biome_points.length; i++)
        {
            var selectedPoint = biome_points[i];
            var currentPoint  = {x : x, y : y};
            
            var dist  = distance_between_two_coords({x:currentPoint.x, y:currentPoint.y}, {x:selectedPoint.x, y:selectedPoint.y});

            if(i === 0)
                temp = {tile : selectedPoint, dist : dist};
            else
            {
                if(dist < temp.dist)
                    temp = {tile : selectedPoint, dist: dist};
            }
        }
        return temp;
    },
    drawStyle : {
        plain : function(draw_style, map_width, map_height, layer_name, biome_points){
            if(!TILEMAP_GENERATOR.info.status)
            {
                console.log("[?] - Initialize the generator first and wait until all tilesets loaded!");
                return false;
            }
            
            if(
                typeof draw_style        !== "string" ||
                typeof map_width         !== "number" ||
                typeof map_height        !== "number" ||
                typeof layer_name        !== "string" ||
                biome_points.constructor !== Array
            )
            {
                console.log("[!] - One of paramaters is wrong type.");
                return false;
            }

            if(typeof biome_points === "number" && biome_points < TILEMAP_GENERATOR.info.config.tiles.length)
                return console.log("[!] - Points count must be at least total tiles' count.");

            console.log("[?] - Generating plain map.");

            //set xml_map
            var xml_map = TILEMAP_GENERATOR.xml_string.map;
            xml_map = xml_map.replace("$draw_style", draw_style)
                            .replace("$map_width", map_width)
                            .replace("$map_height", map_height)
                            .replace("$tile_width", TILEMAP_GENERATOR.info.tile.width)
                            .replace("$tile_height", TILEMAP_GENERATOR.info.tile.height);

            //create empty tile data
            var tile_data = [];
            for(var y=0; y < map_height; y++)
            {
                tile_data[y] = [];
                for(var x=0; x < map_width; x++)
                {
                    tile_data[y][x] = 0;
                }
            }
            //end

            //CREATE RANDOM MAP//

            var shuffled_array = array_shuffle(TILEMAP_GENERATOR.info.config.tiles);

            //create base points
            for(var _z=0; _z < biome_points.length; _z++)
            {
                var tile = shuffled_array[_z];
                
                if(_z >= shuffled_array.length)
                tile = shuffled_array.getRandomElement();

                var base_points = TILEMAP_GENERATOR.parsePoints(biome_points[_z], map_width, map_height);

                var tileset = TILEMAP_GENERATOR.findTilesetFromName(tile.tileset);
                var tileId  = TILEMAP_GENERATOR.findTileId(tile, tileset.firstGid);
                
                tile_data[base_points.y][base_points.x] = tileId;

                biome_points[_z].tileId = tileId;
            }
            
            var t = 0;
            var loop = true;

            while(loop)
            {
                if(!TILEMAP_GENERATOR.isThereEmptyTile(tile_data, map_width, map_height))
                    break;
                
                ///////////////////////////
                var base_points = TILEMAP_GENERATOR.parsePoints(biome_points[t], map_width, map_height);
                var tileId      = tile_data[base_points.y][base_points.x];

                for(var y=0; y < map_height; y++)
                {
                    for(var x=0; x < map_width; x++)
                    {
                        var nearestTile = TILEMAP_GENERATOR.findNearestTile(x, y, biome_points);
                        tile_data[y][x] = nearestTile.tile.tileId;
                    }
                }

                ///////////////////////////
                break; //debug
                t = ++t % biome_points.length;
            }
            
            //END OF CREATE RANDOM MAP //

            var str_tile_data = JSON.stringify(tile_data);
            var str_save_tile_data = "";

            //re-edit tile data
            str_tile_data = str_tile_data.split("[").join("");
            str_tile_data = str_tile_data.split("]").join("");
            str_tile_data = str_tile_data.split(",");

            for(var i=0; i < str_tile_data.length; i++)
            {
                str_save_tile_data += str_tile_data[i];

                if(i !== str_tile_data.length - 1)
                    str_save_tile_data += ",";

                if((i+1) % (map_width) === 0)
                    str_save_tile_data += "\n";
            }

            //create xml layer
            var xml_layer = TILEMAP_GENERATOR.xml_string.layer;
            xml_layer     = xml_layer.replace("$layer_name",layer_name)
                                    .replace("$map_width", map_width)
                                    .replace("$map_height", map_height)
                                    .replace("$layer_array", str_save_tile_data);

            //create xml view
            var xml_view = xml_map;
            xml_view = xml_view.replace("$tileset_xml", TILEMAP_GENERATOR.info.tileset.xml_text)
                                .replace("$layer_xml", xml_layer);

            var saveFileName = "tg_map_data.tmx";
            fs.writeFile(saveFileName, xml_view, (err) => {
                if(err)
                {
                    console.log("[!] - An error occured while saving tile map data into \""+saveFileName+"\".");
                }
                console.log("[?] - Created tile map data saved into \""+saveFileName+"\".");
            });
        }
    }
};

//-- MAIN --//

print(".##.....##....###....########......######...########.##....##.########.########.....###....########..#######..########.\n.###...###...##.##...##.....##....##....##..##.......###...##.##.......##.....##...##.##......##....##.....##.##.....##\n.####.####..##...##..##.....##....##........##.......####..##.##.......##.....##..##...##.....##....##.....##.##.....##\n.##.###.##.##.....##.########.....##...####.######...##.##.##.######...########..##.....##....##....##.....##.########.\n.##.....##.#########.##...........##....##..##.......##..####.##.......##...##...#########....##....##.....##.##...##..\n.##.....##.##.....##.##...........##....##..##.......##...###.##.......##....##..##.....##....##....##.....##.##....##.\n.##.....##.##.....##.##............######...########.##....##.########.##.....##.##.....##....##.....#######..##.....##\n");

// init variables
var map = {
    type   : null,
    width  : null,
    height : null,
    tile   : {
        width  : null,
        height : null
    },
    drawStyle : null
};
var biome_points = [];
var biome_points_count = null;
var layerName    = null;
var configFile   = null;
///////////////////////////////
var mapTypes = {
    list  : ["plain"],
    index : null
};

var mapDrawStyles = {
    list  : ["orthogonal","isometric"],
    index : null
};

//-- GET INPUT --//

//get config file
configFile = readline.question("Config file: ");

//get map draw style
mapDrawStyles.index = readline.keyInSelect(mapDrawStyles.list, "Map draw style?");
map.drawStyle       = mapDrawStyles.list[mapDrawStyles.index];

//get map type
mapTypes.index = readline.keyInSelect(mapTypes.list, "Map Type?");
map.type       = mapTypes.list[mapTypes.index];

print();

//get map width and height
map.width  = readline.questionInt("Map width : ");
map.height = readline.questionInt("Map height: ");

print();

//get tile width and height
map.tile.width  = readline.questionInt("Tile width : ");
map.tile.height = readline.questionInt("Tile height: ");

print();

//get biome points count
biome_points_count    = readline.questionInt("Total biome points: ");

var _biome_pt_modes   = ["manuel","auto"]
var biome_points_mode = readline.keyInSelect(_biome_pt_modes, "Map points generate mod?");
biome_points_mode     = _biome_pt_modes[biome_points_mode];

if(biome_points_mode === "manuel")
{
    for(var i=0; i < biome_points_count; i++)
    {
        var pt_str = readline.question("Point "+(i+1)+" (X,Y): ");
        var pt = pt_str.split(",");

        if(pt.length !== 2)
        {
            print("[!] Wrong points. Try again!\n");
            i--;
            continue;
        }
        else
        {
            var point = {x:parseInt(pt[0]), y:parseInt(pt[1])};
            biome_points.push(point);
        }
    }
}
else if(biome_points_mode === "auto")
{
    biome_points = TILEMAP_GENERATOR.generateRandomPoint(biome_points_count, map.width, map.height);
}

print();

//get layer name
layerName = readline.question("Layer name: ");

TILEMAP_GENERATOR.init(configFile, map.tile.width, map.tile.height);

eventEmitter.on("Tilesets_Loaded", function(){
    TILEMAP_GENERATOR.drawStyle[map.type](map.drawStyle, map.width, map.height, layerName, biome_points);
});
