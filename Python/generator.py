import random
import json
from math import sqrt, floor
from PIL import Image

class TileGenerator:
    class HelperFunctions:
        @staticmethod
        def arrayShuffle(arr):
            random.shuffle(arr)

        @staticmethod
        def randomInt(min, max): # Including min and max
            return random.randint(min, max)

        @staticmethod
        def isNegative(num):
            return num < 0

        @staticmethod
        def distanceBetweenTwoCoords(coord1, coord2): # tuple(x,y), tuple(x,y)
            x = coord2[0] - coord1[0]
            y = coord2[1] - coord1[1]
            
            return sqrt(x*x + y*y)

        @staticmethod
        def getRandomElement(arr):
            return random.choice(arr)

        @staticmethod
        def parsePoints(pt, mapW, mapH): # pt -> tuple(x, y), mapW -> int, mapH -> int
            if TileGenerator.HelperFunctions.isNegative(pt[0]):
                pt[0] = (mapW - 1) + pt[0]
            
            if TileGenerator.HelperFunctions.isNegative(pt[1]):
                pt[1] = (mapH - 1) + pt[1]

            return pt

    def __init__(self, configData, mapType, mapDrawStyle, mapWidth, mapHeight, tileWidth, tileHeight, totalBiomePoints, layerName):
        # Status variables
        self.isBiomePointsGenerated = False
        self.isTilesetsLoaded       = False
        self.isEmptyMapCreated      = False
        self.isBasePointsGenerated  = False
        self.isMapGenerated         = False

        # Tiled's XML map data
        self.XML_STRING  = {
            "layer"   : "<layer name='$layer_name' width='$map_width' height='$map_height'>\n" +
                            "<data encoding='csv'>\n" +
                                "$layer_array"+
                            "</data>\n"+
                        "</layer>",
            "tileset" : "<tileset firstgid='$tileset_firstgid' name='$tileset_name' tilewidth='$tile_width' tileheight='$tile_height' tilecount='$tile_count' columns='$tileset_cols'>\n" +
                            "<image source='$tileset_source' trans='ff00ff' width='$image_width' height='$image_height'/>\n" +
                        "</tileset>",
            "map"     : "<?xml version='1.0' encoding='UTF-8'?>\n" +
                        "<map version='1.0' tiledversion='2018.04.18' orientation='$draw_style' renderorder='left-up' width='$map_width' height='$map_height' tilewidth='$tile_width' tileheight='$tile_height' infinite='0' nextobjectid='1'>\n" +
                            "$tileset_xml\n" +
                            "$layer_xml\n"+
                        "</map>\n"
        }

        # Map Variables
        self.MAP = {
            "type"        : None, # string
            "drawStyle"   : None, # string
            "width"       : None, # int
            "height"      : None, # int
            "biomeCount"  : None, # int
            "biomePoints" : None  # [(x, y), (x, y)]
        }
        self.TILE_MAP = None # Multi-dimensional array based on width and height of map

        # Tile Variables
        self.TILE = {
            "width"  : None, # int
            "height" : None  # int
        }

        # Tileset Variables
        self.TILESET = {
            "loaded"  : 0,
            "lastGid" : 0,
            "xmlText" : "",
            "list"    : []
        }

        # Variables
        self.CONFIG_DATA        = configData
        self.MAP["type"]        = mapType
        self.MAP["drawStyle"]   = mapDrawStyle
        self.MAP["width"]       = mapWidth
        self.MAP["height"]      = mapHeight
        self.MAP["biomeCount"]  = totalBiomePoints
        self.TILE["width"]      = tileWidth
        self.TILE["height"]     = tileHeight
        self.layerName          = layerName

    def start(self):
        print("Starting...")
        
        if len(self.CONFIG_DATA["tilesets"]) < 1:
            print("Error: Couldn't find any tileset in config file.")
            return
        elif len(self.CONFIG_DATA["tiles"]) < 1:
            print("Error: Couldn't find any tile in config file.")
            return
        # elif self.MAP["biomeCount"] < len(self.CONFIG_DATA["tiles"]):
        #     print("Error: Biome point count must be at least total tiles' count.")
        #     return

        # Load tileset properties
        self.loadTilesetProperties()
        
        # Biome point generation
        self.generateBiomePoints()

        # Map generation
        if self.MAP["type"] == "plain": # plain map
            self.drawPlainMap()

    def reset(self):
        self.isBiomePointsGenerated = False
        self.isTilesetsLoaded       = False
        self.isEmptyMapCreated      = False
        self.isBasePointsGenerated  = False
        self.isMapGenerated         = False

        self.TILESET = {
            "loaded"  : 0,
            "lastGid" : 0,
            "xmlText" : "",
            "list"    : []
        }
            
# Main Functions
    def loadTilesetProperties(self):
        mainPath = self.CONFIG_DATA["tileset_location"]

        for i,tileset in enumerate(self.CONFIG_DATA["tilesets"]):
            fullPath = mainPath+tileset["src"]
            img      = Image.open(fullPath)

            imgW, imgH = img.size

            imgProperties = {
                "width"    : imgW,
                "height"   : imgH,
                "fullPath" : fullPath,
                "index"    : i
            }

            tileset["imgProperties"] = imgProperties

            self.TILESET["list"].append(tileset)

            self.TILESET["loaded"] += 1
            
            firstGid = self.TILESET["lastGid"] + 1

            cols = floor(imgProperties["width"]  /  self.TILE["width"])
            rows = floor(imgProperties["height"] / self.TILE["height"])

            self.TILESET["list"][i]["firstGid"]   = firstGid
            self.TILESET["list"][i]["totalTiles"] = cols * rows

            xmlTileset = self.XML_STRING["tileset"]
            xmlTileset = xmlTileset.replace("$tileset_firstgid", str(firstGid))
            xmlTileset = xmlTileset.replace("$tileset_name", tileset["name"])
            xmlTileset = xmlTileset.replace("$tile_width", str(self.TILE["width"]))
            xmlTileset = xmlTileset.replace("$tile_height", str(self.TILE["height"]))
            xmlTileset = xmlTileset.replace("$tile_count", str(cols * rows))
            xmlTileset = xmlTileset.replace("$tileset_cols", str(cols))
            xmlTileset = xmlTileset.replace("$tileset_source", tileset["imgProperties"]["fullPath"])
            xmlTileset = xmlTileset.replace("$image_width", str(imgProperties["width"]))
            xmlTileset = xmlTileset.replace("$image_height", str(imgProperties["height"]))

            self.TILESET["xmlText"] += xmlTileset

            # -- Set last gid
            self.TILESET["lastGid"] = self.TILESET["lastGid"] + (cols * rows)

        self.isTilesetsLoaded = True

        print("Tilesets are loaded.")

    def generateBiomePoints(self):
        if not self.isTilesetsLoaded:
            print("Error: Tilesets are not loaded.")
            return

        points = [] # tuple(x, y)

        for _ in range(0, self.MAP["biomeCount"]):
            while 1:
                pt = (
                    self.HelperFunctions.randomInt(0, self.MAP["width"]  - 1),
                    self.HelperFunctions.randomInt(0, self.MAP["height"] - 1)
                )

                if pt in points: continue
                
                points.append(pt)
                break

        self.MAP["biomePoints"] = points
        
        self.isBiomePointsGenerated = True

        print("Biome points are generated.")

    def generateMap(self, basePoints):
        if not self.isBasePointsGenerated:
            print("Error: Base points are not generated.")
            return
        
        for y in range(0, self.MAP["height"]):
            for x in range(0, self.MAP["width"]):
                nearestBasePoint = self.findNearestBasePoint(x, y, basePoints)
                
                # Update tile map
                self.TILE_MAP[y][x] = nearestBasePoint["tileGid"]

        self.isMapGenerated = True

        print("Tile map is generated.")

    def saveMapAsTMX(self):
        if not self.isMapGenerated:
            print("Error: Map is not generated.")
            return

        tileDataStr = json.dumps(self.TILE_MAP)

        tileDataStr = "".join(tileDataStr.split("["))
        tileDataStr = "".join(tileDataStr.split("]"))
        
        # Edit xml strings
        xmlMap = self.XML_STRING["map"]
        xmlMap = xmlMap.replace("$draw_style", self.MAP["drawStyle"])
        xmlMap = xmlMap.replace("$map_width", str(self.MAP["width"]))
        xmlMap = xmlMap.replace("$map_height", str(self.MAP["height"]))
        xmlMap = xmlMap.replace("$tile_width", str(self.TILE["width"]))
        xmlMap = xmlMap.replace("$tile_height", str(self.TILE["height"]))

        xmlLayer = self.XML_STRING["layer"]
        xmlLayer = xmlLayer.replace("$layer_name", self.layerName)
        xmlLayer = xmlLayer.replace("$map_width", str(self.MAP["width"]))
        xmlLayer = xmlLayer.replace("$map_height", str(self.MAP["height"]))
        xmlLayer = xmlLayer.replace("$layer_array", tileDataStr)

        xmlView  = xmlMap
        xmlView  = xmlView.replace("$tileset_xml", self.TILESET["xmlText"])
        xmlView  = xmlView.replace("$layer_xml", xmlLayer)

        saveFileName = "tg_map_data.tmx"
        with open(saveFileName, "w") as f:
            f.write(xmlView)
            print("Tile map data saved to \"{}\".".format(saveFileName))

        reGenerate = input("Would you like to regenerate the tile map? [y/n] ")

        if reGenerate == "y":
            self.reset()
            self.start()

    def drawPlainMap(self):
        if not self.isBiomePointsGenerated:
            print("Error: Biome points are not generated.")
            return

        print("Creating empty tile map.")

        # Create empty map data
        self.TILE_MAP = self.createEmptyMap(self.MAP["width"], self.MAP["height"])

        print("Shuffling the tile list.")

        # Shuffle tiles array from config
        random.shuffle(self.CONFIG_DATA["tiles"])

        print("Creating the base points.")

        # Create base points
        basePoints = self.createBasePoints(self.MAP["biomeCount"])

        print("Starting the map generation.")

        # Start generation
        self.generateMap(basePoints)

        print("Saving the map.")

        # Save the map as TMX file.
        self.saveMapAsTMX()

# -- Sub Functions
    # Create empty map
    def createEmptyMap(self, w, h):
        m = []

        for y in range(0, h):
            m.append([])
            for _ in range(0, w):
                m[y].append(0)

        self.isEmptyMapCreated = True

        return m

    # Create base points
    def createBasePoints(self, biomeCount):
        if not self.isEmptyMapCreated:
            print("Error: Empty map is not created.")
            return
        
        biomePoints = []
        
        for i in range(0, biomeCount):
            if i < len(self.CONFIG_DATA["tiles"]):
                tile = self.CONFIG_DATA["tiles"][i]
            else:
                tile = random.choice(self.CONFIG_DATA["tiles"])

            basePoint = self.HelperFunctions.parsePoints(self.MAP["biomePoints"][i], self.MAP["width"], self.MAP["height"])
            tileset   = self.findTilesetFromName(tile["tileset"])
            tileGid   = self.findTileGid(tile, tileset["firstGid"])

            biomeData = {
                "position" : basePoint, # tuple(x, y)
                "tileGid"  : tileGid     # int
            }

            self.TILE_MAP[biomeData["position"][1]][biomeData["position"][0]] = biomeData["tileGid"]

            biomePoints.append(biomeData)
        
        self.isBasePointsGenerated = True

        return biomePoints

# ---- Helper Functions
    def findTilesetFromName(self, tilesetName):
        for tileset in self.TILESET["list"]:
            if tilesetName == tileset["name"]:
                return tileset
        
        return None

    def findTileGid(self, tile, firstGid):
        tileset = self.findTilesetFromName(tile["tileset"])

        tileW = tile["position"]["x"] / self.TILE["width"]
        tileH = tile["position"]["y"] / self.TILE["height"]

        magic = tileset["imgProperties"]["width"]  / self.TILE["width"] * tileH

        tileGid  = int(tileW + firstGid + magic)

        return tileGid

    def findNearestBasePoint(self, x, y, basePoints):
        temp = {
            "tileGid" : 0, # int
            "dist"    : 0  # int
        }

        for i in range(0, len(basePoints)):
            basePointObj = basePoints[i]
            currentPoint = (x, y)
            
            dist = self.HelperFunctions.distanceBetweenTwoCoords(currentPoint, basePointObj["position"])

            if i == 0: temp = { "tileGid" : basePointObj["tileGid"], "dist" : dist }
            else:
                if temp["dist"] < dist:
                    temp = { "tileGid" : basePointObj["tileGid"], "dist" : dist }

        return temp
