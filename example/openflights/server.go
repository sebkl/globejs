package main


import (
	. "github.com/sebkl/gotojs"
	. "github.com/sebkl/gopenflights"
	"log"
)


type Openflights struct {
	db *Database
}

// AirportsGeo returns a list of all airport geo coordinates.
// In addition to that it contains the amount of routes from/to this
// airport are registered.
func (o *Openflights) AirportsGeo() (ret [][]float64) {
	ret = make([][]float64,len(o.db.Airports))
	for i,a := range o.db.Airports {
		ret[i] = make([]float64,3)
		ret[i][0] = a.Long
		ret[i][1] = -a.Lat
		ret[i][2] = float64(len(o.db.RoutesByAirport(a.Id)) + 1)
	}
	return
}

// RoutesGeo returns the Geo coordinates of all routes without duplicates.
// Back and forth rooutes are counted once.
func (o *Openflights) RoutesGeo() [][]float64 {
	type coords struct {
		long,lat float64
	}
	ret := make([][]float64,len(o.db.Routes))
	done := make(map[coords]coords)
	idx := 0
	for i,r := range o.db.Routes {
		ret[i] = make([]float64,4)
		s:= r.SourceAirportP
		d:= r.DestAirportP
		if s != nil && s != nil {
			f := coords{s.Long,-s.Lat}
			t := coords{d.Long,-d.Lat}
			if done[f] != t {
				ret[idx][0] = s.Long
				ret[idx][1] = -s.Lat
				ret[idx][2] = d.Long
				ret[idx][3] = -d.Lat
				done[f] = t
				done[t] = f
				idx++
			}
		}
	}
	return ret[:idx]
}

func main() {
	of := Openflights{db: NewDatabase()}
	server := NewFrontend(Parameters{
		P_PUBLICDIR: "htdocs",
		P_PUBLICCONTEXT: "p",
		P_EXTERNALURL: "http://localhost:8080/gotojs"})
	server.ExposeInterface(&of)
	server.EnableFileServer("htdocs","p")
	server.Redirect("/","/p/")
	log.Fatal(server.Start(":8080"))
}
