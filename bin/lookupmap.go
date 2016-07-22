package main

import (
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"log"
	"os"
	"strconv"
	"text/template"
)

const (
	DEFAULT_COUNTRYMAP_IMAGE_FN = "atlas/countrymap.png"
	DEFAULT_OUTPUT_FN           = "lookup.js"
	DEFAULT_COUNTRYNAME_FN      = "countrydata/country_names.json"
	DEFAULT_COUNTRYMAP_FN       = "countrydata/country_map.json"
	STEP                        = 5
	TEMPLATE_LOOKUP_MAP         = `
GLOBE.GEO.NO_COUNTRY = "";

GLOBE.GEO.index_to_country = function(idx) {
	return this.countrylist[idx];
}

GLOBE.GEO.country_to_index = function(iso) {
	return this.countryrlist[iso];
}

GLOBE.GEO.lookup_country = function(x,y) {
	try {
		var long_idx = Math.round((x+180)*10/{{.Step}});
		var lat_idx = Math.round((y+90)*10/{{.Step}});
		return this.geolookup[long_idx][lat_idx];
	} catch (err) {
		return undefined;
	}
}

GLOBE.GEO.lookup_geo_array = function(iso) {
	return this.countrylookup[iso.toUpperCase()];
}

GLOBE.GEO.lookup_geo_points = function(iso) {
	var a = this.lookup_geo_array(iso.toUpperCase());
	try {
		var ret = a[Math.round(a.length/2)-1];
		return ([ret[0] - 180,ret[1] -90]);
	} catch (err) {
		console.log('Cannot lookup geopoints for: '+iso);
		return undefined;
	}
}

GLOBE.GEO.lookup_countryname = function(iso) {
	try {
		return this.countrynames[iso.toUpperCase()];
	} catch (err) {
		console.log('Cannot lookup country name for: '+iso);
	}
}
`
)

// polar2pixel extracts the pixel of image that maps to the given longitude
// and latitude.
func polar2pixel(img image.Image, long, lat float64) color.Color {
	x := int((long / 360.0) * float64(img.Bounds().Dx()))
	y := int((lat / 180.0) * float64(img.Bounds().Dy()))
	return img.At(x, y)
}

func loadPNGImage(fn string) (img image.Image, err error) {
	f, err := os.Open(fn)
	if err != nil {
		return img, fmt.Errorf("Failed to open image '%s': %s", fn, err)
	}

	img, err = png.Decode(f)
	if err != nil {
		return img, fmt.Errorf("Failed to load image '%s': %s", fn, err)
	}
	return img, nil
}

// loadJSONMap loads a JSON string->string map from the given filename.
func loadJSONMap(fn string) (ret map[string]string, err error) {
	f, err := os.Open(fn)
	if err != nil {
		return ret, err
	}

	ret = make(map[string]string)

	decoder := json.NewDecoder(f)
	err = decoder.Decode(&ret)
	if err != nil {
		return ret, err
	}

	return ret, err
}

func main() {
	cmap_image_fn := DEFAULT_COUNTRYMAP_IMAGE_FN
	outfile := DEFAULT_OUTPUT_FN
	country_names_fn := DEFAULT_COUNTRYNAME_FN
	country_map_fn := DEFAULT_COUNTRYMAP_FN

	if len(os.Args) > 1 {
		outfile = os.Args[1]
	}
	log.Printf("Outputfile: %s", outfile)

	cmap_image, err := loadPNGImage(cmap_image_fn)
	if err != nil {
		log.Fatal("Failed to load countrymap: '%s'", err)
	}

	cc, err := loadJSONMap(country_map_fn)
	if err != nil {
		log.Fatalf("Failed to load country map '%s': %s", country_map_fn, err)
	}

	sm := make([][]string, int(3600/STEP))
	countryindex := make(map[string][2]int)
	for lo := 0; lo < 3600; lo += STEP {
		//longidx := int(lo / (10 * STEP))
		longidx := int(lo / STEP)
		sm[longidx] = make([]string, int(1800/STEP))

		for la := 0; la < 1800; la += STEP {
			//latidx := int(la / (10 * STEP))
			latidx := int(la / STEP)
			lau := float64(la) / 10
			lou := float64(lo) / 10
			//log.Printf("%f, %f", lau, lou)
			col := polar2pixel(cmap_image, lou, lau)
			r, _, _, _ := col.RGBA() //uint32
			ref := int(r >> 8)

			sref := strconv.Itoa(ref)
			if val, ok := cc[sref]; ok {
				//sm[longidx][latidx] = fmt.Sprintf("'%s'", val)
				sm[longidx][latidx] = val
			} else {
				//sm[longidx][latidx] = sref
			}

			countryindex[sref] = [2]int{int(lo / 10), int(la / 10)}
		}
	}

	f, err := os.OpenFile(outfile, os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatalf("Could not open output file '%s': %s", outfile, err)
	}
	enc := json.NewEncoder(f)

	// ########## GEO -> ISO #############
	fmt.Fprintf(f, "GLOBE.GEO.geolookup = ")
	err = enc.Encode(sm)
	if err != nil {
		log.Fatalf("Failed to encode geo 2 country mapping: %s", err)
	}
	fmt.Fprintf(f, ";\n")

	// ########## ISO -> GEO #############
	fmt.Fprintf(f, "GLOBE.GEO.countrylookup = ")
	err = enc.Encode(countryindex)
	if err != nil {
		log.Fatalf("Failed to encode country 2 geo mapping: %s", err)
	}
	fmt.Fprintf(f, ";\n")

	// ########## ISO -> COUNTRY NAME #############
	ccs, err := loadJSONMap(country_names_fn)
	if err != nil {
		log.Fatalf("Failed to load country name '%s': %s", country_names_fn, err)
	}
	fmt.Fprintf(f, "GLOBE.GEO.countrnames = ")
	err = enc.Encode(ccs)
	if err != nil {
		log.Fatalf("Failed to encode iso 2 country-name mapping: %s", err)
	}
	fmt.Fprintf(f, ";\n")

	// ########## IDX -> ISO, ISO -> IDX #############
	clist := make([]string, 256)
	rclist := make(map[string]int)
	for i, _ := range clist {
		cidxs := strconv.Itoa(i)
		if iso, ok := cc[cidxs]; ok {
			clist[i] = iso
			if iso == "UK" { //UK/GB fuckup.
				rclist["GB"] = i
			}
			rclist[iso] = i
		} else {
			clist[i] = cidxs
			rclist[cidxs] = i
		}
	}
	fmt.Fprintf(f, "GLOBE.GEO.countrylist = ")
	enc.Encode(clist)
	fmt.Fprintf(f, ";\n")
	fmt.Fprintf(f, "GLOBE.GEO.countryrlist = ")
	enc.Encode(rclist)
	fmt.Fprintf(f, ";\n")

	tmpl := template.New("functions")
	tmpl, err = tmpl.Parse(TEMPLATE_LOOKUP_MAP)

	if err != nil {
		log.Fatalf("Could not parse tempalte: %s", err)
	}

	err = tmpl.Execute(f, &struct{ Step int }{STEP})
	if err != nil {
		log.Fatalf("Failed to execute template: %s", err)
	}
}
