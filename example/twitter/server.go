package main

import (
	. "github.com/sebkl/gotojs"
	. "github.com/sebkl/gotojs/stream"
	. "github.com/sebkl/gotojs/stream/twitter"
	"log"
)

func main() {
	server := NewFrontend()
	tstream,err := NewTwitterStream(server.BaseUrl())
	if err != nil {
		log.Fatal(err)
	}
	server.EnableFileServer("htdocs","p")
	server.Redirect("/","/p/")
	//server.ExposeMethods(tstream,"Next")
	server.ExposeInterface(tstream,"Tweets")
	server.ExposeYourself()

	log.Fatal(server.Start(":8888"))
}

