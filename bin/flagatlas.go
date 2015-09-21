package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"image"
	"image/png"
	"log"
	"os"
	"strconv"
)

func printUsage() {
	fmt.Fprint(os.Stderr, `
usage: %s <flag_dir> <country_table> <flagatlas> <flags.css> <flagatlas_url>

`, os.Args[0])

}

/* { ...
        "91":  "FR",
	"86":  "DE", ... } */
type CountryData map[string]string

func main() {
	flag.Parse()
	args := flag.Args()
	if len(args) < 5 {
		printUsage()
		log.Fatal("Not enough arguments")
	}

	dirname := args[0]
	countrytable_fn := args[1]
	targetpng_fn := args[2]
	targetcss_fn := args[3]
	targetpng_url := args[4]

	ct, err := os.Open(countrytable_fn)
	if err != nil {
		log.Fatal("Could not open countrytable '%s' : %s'", countrytable_fn, err)
	}

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

		ifn := fmt.Sprintf("%s/%s.png", dirname, f)
		if f == "UK" { //Map UK to GB
			ifn = fmt.Sprintf("%s/%s.png", dirname, "GB")
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
	outcss := ""

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
		outcss += fmt.Sprintf(".flag_%s,.CID_%d {background: transparent url(%s) no-repeat %dpx %dpx; width: %dpx; height: %dpx; background-size: cover }\n", f, id, targetpng_url, 0, -dy, sibounds.Dx(), sibounds.Dy())
	}

	tpng, err := os.OpenFile(targetpng_fn, os.O_CREATE|os.O_TRUNC|os.O_EXCL|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatal("Could not open target png file '%s' : %s'", targetpng_fn, err)
	}

	//Write output image
	err = png.Encode(tpng, outimg)
	if err != nil {
		log.Fatal("Could not write output image: %s", err)

	}

	//Write output css
	tcss, err := os.OpenFile(targetcss_fn, os.O_CREATE|os.O_TRUNC|os.O_EXCL|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatal("Could not open target css file '%s' : %s'", targetcss_fn, err)
	}
	fmt.Fprintf(tcss, outcss)
}
