package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"github.com/sebkl/flagconf"
	"image"
	"image/png"
	"log"
	"os"
	"strconv"
)

const (
	DEFAULT_FLAGDIR         = "atlas/flags"
	DEFAULT_COUNTRYTABLE_FN = "countrydata/country_map.json"
	DEFAULT_OUTPUT_CSS_FN   = "HTDOCS/gen/flags.css"
	DEFAULT_OUTPUT_IMAGE_FN = "HTDOCS/den/flagatlas.png"
	DEFAULT_URL             = "flagatlas.png"
)

var config struct {
	FlagDir       string
	CountryMapFN  string
	OutputImageFN string
	OutputCSSFN   string
	Url           string
}

func init() {
	flag.StringVar(&config.FlagDir, "fd", DEFAULT_FLAGDIR, "Directory where to find country flags. (<ISO>.png)")
	flag.StringVar(&config.CountryMapFN, "cm", DEFAULT_COUNTRYTABLE_FN, "Country mapping file (JSON).")
	flag.StringVar(&config.OutputImageFN, "o", DEFAULT_OUTPUT_IMAGE_FN, "Flagatlas output image (PNG)")
	flag.StringVar(&config.OutputCSSFN, "css", DEFAULT_OUTPUT_CSS_FN, "Flagatlas output CSS ")
	flag.StringVar(&config.Url, "url", DEFAULT_URL, "Final URL to reference in CSS. ")
}

/* { ...
        "91":  "FR",
	"86":  "DE", ... } */
type CountryData map[string]string

func main() {
	flagconf.Parse("GLOBEJS_FLAGATLAS")

	ct, err := os.Open(config.CountryMapFN)
	if err != nil {
		log.Fatal("Could not open countrytable '%s' : %s'", config.CountryMapFN, err)
	}
	defer ct.Close()

	cdata := make(CountryData)
	dec := json.NewDecoder(ct)
	err = dec.Decode(&cdata)
	if err != nil {
		log.Fatalf("Could not decode country data: %s", err)
	}

	imagemap := make(map[string]image.Image)
	idmap := make(map[string]int)
	maxid := 0

	// Read image data
	for i, f := range cdata {

		ifn := fmt.Sprintf("%s/%s.png", config.FlagDir, f)
		if f == "UK" { //Map UK to GB
			ifn = fmt.Sprintf("%s/%s.png", config.FlagDir, "GB")
		}

		//Read the flag image.
		flag, err := os.Open(ifn)
		if err != nil {
			log.Printf("Could not open flag '%s' : %s'", ifn, err)
			continue
		}
		imagemap[f], err = png.Decode(flag)
		if err != nil {
			log.Printf("Could not decode image '%s': %s", ifn, err)
			continue
		}

		//Get the image ID
		id, err := strconv.Atoi(i)
		if err != nil {
			log.Printf("Could not decode image id: '%s': %s", i, err)
			continue
		}
		idmap[f] = id
		if id > maxid { // maxid to compute image array
			maxid = id
		}

	}

	//Output css
	outcss := ".flag_undefined { background: transparent; width: 160px; height: 80px; }\n"

	//Generate output image
	sibounds := imagemap["DE"].Bounds()
	outimg := image.NewRGBA(image.Rect(0, 0, sibounds.Size().X, sibounds.Size().Y*(maxid+1)))

	for f, im := range imagemap {
		id := idmap[f]
		dy := id * sibounds.Dy()
		for x := 0; x < sibounds.Dx(); x++ {
			for y := 0; y < sibounds.Dy(); y++ {
				outimg.Set(x, y+dy, im.At(x, y))
			}
		}
		outcss += fmt.Sprintf(".flag_%s,.CID_%d {background: transparent url(%s) no-repeat %dpx %dpx; width: %dpx; height: %dpx; background-size: cover }\n", f, id, config.Url, 0, -dy, sibounds.Dx(), sibounds.Dy())
	}

	tpng, err := os.OpenFile(config.OutputImageFN, os.O_CREATE|os.O_TRUNC|os.O_EXCL|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatal("Could not open target png file '%s' : %s'", config.OutputImageFN, err)
	}
	defer tpng.Close()

	//Write output image
	err = png.Encode(tpng, outimg)
	if err != nil {
		log.Fatal("Could not write output image: %s", err)

	}

	//Write output css
	tcss, err := os.OpenFile(config.OutputCSSFN, os.O_CREATE|os.O_TRUNC|os.O_EXCL|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatal("Could not open target css file '%s' : %s'", config.OutputCSSFN, err)
	}
	defer tcss.Close()
	fmt.Fprintf(tcss, outcss)
}
