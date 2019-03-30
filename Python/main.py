# Modules
import json
from generator import TileGenerator

# Variables
CONFIG_FILE    = "config.json"

MAP_TYPES      = ["plain"]
MAP_DRAW_STYLE = ["orthogonal", "isometric"]

def get_list_input(question, valueList, eol=True):
    for i, value in enumerate(valueList):
        print("["+str(i+1)+"] - "+value)

    while 1:
        try:
            answer = int(input("\n"+question+" "))

            if answer < 0 or answer > len(valueList):
                continue

            else:
                if eol: print()
                return valueList[answer - 1]
            
        except ValueError:
            pass

def get_input(question, isInt=False, eol=True):
    while 1:
        try:
            answer = input(question+" ")

            if isInt:
                answer = int(answer)

            if eol: print()
            return answer
            
        except ValueError:
            pass

if __name__ == "__main__":
    # Local variables
    CONFIG_DATA = None

    # Load config file
    with open(CONFIG_FILE, "r") as f:
        CONFIG_DATA = json.load(f)

    # Main
    print(".##.....##....###....########......######...########.##....##.########.########.....###....########..#######..########.\n.###...###...##.##...##.....##....##....##..##.......###...##.##.......##.....##...##.##......##....##.....##.##.....##\n.####.####..##...##..##.....##....##........##.......####..##.##.......##.....##..##...##.....##....##.....##.##.....##\n.##.###.##.##.....##.########.....##...####.######...##.##.##.######...########..##.....##....##....##.....##.########.\n.##.....##.#########.##...........##....##..##.......##..####.##.......##...##...#########....##....##.....##.##...##..\n.##.....##.##.....##.##...........##....##..##.......##...###.##.......##....##..##.....##....##....##.....##.##....##.\n.##.....##.##.....##.##............######...########.##....##.########.##.....##.##.....##....##.....#######..##.....##\n")
    
    # Get options
    mapType          = get_list_input("Map type?",            MAP_TYPES)
    
    mapDrawStyle     = get_list_input("Map draw style?", MAP_DRAW_STYLE)

    mapWidth         = get_input("Map width?",               isInt=True)
    mapHeight        = get_input("Map height?",              isInt=True)

    tileWidth        = get_input("Tile width?",              isInt=True)
    tileHeight       = get_input("Tile height?",             isInt=True)

    totalBiomePoints = get_input("Total biome points?",      isInt=True)

    layerName        = get_input("Layer name?")

    # Start generating
    generator = TileGenerator(
        CONFIG_DATA,
        mapType,   mapDrawStyle,
        mapWidth,  mapHeight,
        tileWidth, tileHeight,
        totalBiomePoints,
        layerName
    )
    generator.start()
