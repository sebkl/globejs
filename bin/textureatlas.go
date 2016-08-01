package main

import (
	"encoding/json"
	"flag"
	"github.com/nfnt/resize"
	"github.com/sebkl/flagconf"
	"image"
	"image/color"
	"image/png"
	"log"
	"os"
	"reflect"
)

//TODO: Generalize this / Create a dedicated to for image atlases.

const (
	R = iota
	G = iota
	B = iota
	A = iota
)

type Color int
type SourceConfig struct {
	Filename string
	Color    Color
}
type ColorMapping map[Color]SourceConfig
type TextureConfig []ColorMapping

const (
	WIDTH             = 4096
	HEIGHT            = 2048
	DEFAULT_OUTPUT_FN = "atlas.png"
	DEFAULT_CONFIG_FN = "atlas.json"
)

var config struct {
	ConfigurationFN string
	OutputFN        string
}

func init() {
	flag.StringVar(&config.ConfigurationFN, "c", DEFAULT_CONFIG_FN, "Configuration file.")
	flag.StringVar(&config.OutputFN, "o", DEFAULT_OUTPUT_FN, "Output file. (atlas image,PNG).")
}

//buildImage assembles an image based on the given configuration.
func buildImage(cfg *TextureConfig) image.Image {
	files := map[string]image.Image{} //TODO: make file cache global.

	//Open and load input images.
	for _, cc := range *cfg {
		for _, source := range cc {
			//Skip if file is already loaded.
			if _, ok := files[source.Filename]; ok {
				continue
			}

			log.Printf("Loading image '%s'", source.Filename)
			f, err := os.Open(source.Filename)
			if err != nil {
				log.Fatalf("Error opening '%s': %s", source.Filename, err)
			}
			defer f.Close()

			img, err := png.Decode(f)
			if err != nil {
				log.Fatalf("Error decoding file '%s': %s", source.Filename, err)
			}

			//TODO: resize image to target WIDTH and HEIGHT
			img = resize.Resize(WIDTH, HEIGHT, img, resize.NearestNeighbor)
			if _, ok := img.(*image.NRGBA); !ok {
				log.Printf("Image '%s' not in NRGBA format: %s", source.Filename, reflect.TypeOf(img).String())
			}
			files[source.Filename] = img
		}
	}

	//Pixel mashup
	out := image.NewNRGBA(image.Rect(0, 0, WIDTH, len(*cfg)*HEIGHT))
	for i, cc := range *cfg {
		imagecount := len(*cfg)
		log.Printf("Processing image %d of %d", i+1, imagecount)

		theight := (i + 1) * HEIGHT
		fheight := i * HEIGHT
		y := 0
		for ty := fheight; ty <= theight; ty++ {
			//TODO: log status
			for x := 0; x < WIDTH; x++ {
				//Initial Color
				co := []uint8{255, 255, 255, 255}

				for cb, source := range cc {
					simg := files[source.Filename]

					if nrgba, ok := simg.(*image.NRGBA); ok {
						c := nrgba.NRGBAAt(x, y)
						ca := []uint8{c.R, c.G, c.B, c.A}
						co[cb] = uint8(ca[source.Color])
					} else if rgba, ok := simg.(*image.RGBA); ok {
						c := rgba.RGBAAt(x, y)
						ca := []uint8{c.R, c.G, c.B, c.A}
						co[cb] = uint8(ca[source.Color])
					} else if gray, ok := simg.(*image.Gray); ok {
						v := gray.GrayAt(x, y).Y
						co[cb] = v
					} else {
						log.Fatalf("Unsupported color format: '%s'", reflect.TypeOf(simg))
					}
				}

				out.Set(x, ty, color.NRGBA{
					co[0],
					co[1],
					co[2],
					co[3],
				})
			}
			y++
		}
	}
	return out
}

func main() {
	flagconf.Parse("GOTOJS_TEXTUREATLAS")

	type SourceReadConfig [][]map[string]uint8
	icfg := SourceReadConfig{}

	f, err := os.Open(config.ConfigurationFN)
	if err != nil {
		log.Fatalf("Configuration file '%s' error: %s", config.ConfigurationFN, err)
	}
	defer f.Close()

	decoder := json.NewDecoder(f)
	err = decoder.Decode(&icfg)
	if err != nil {
		log.Fatalf("Configuration file '%s' decoding error: %s", config.ConfigurationFN, err)
	}

	//TODO: simplify this
	cfg := make(TextureConfig, len(icfg))
	for i, cm := range icfg {
		cfg[Color(i)] = make(map[Color]SourceConfig)
		for cb, scm := range cm {
			for sfn, tcb := range scm {
				cfg[Color(i)][Color(cb)] = SourceConfig{
					Filename: sfn,
					Color:    Color(tcb),
				}
				break
			}
		}
	}

	log.Printf("Processing output file: '%s'", config.OutputFN)
	img := buildImage(&cfg)
	f, err = os.OpenFile(config.OutputFN, os.O_CREATE|os.O_WRONLY, 0644)
	err = png.Encode(f, img)
	if err != nil {
		log.Fatalf("Encoding PNG image failed: '%s'", err)
	}
	defer f.Close()
}
