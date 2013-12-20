package main


import (
	. "github.com/sebkl/gotojs"
	. "github.com/sebkl/gopenflights"
	"log"
)

func main() {
	db := NewDatabase()
	server := NewFrontend()
	server.ExposeMethods(db,"Geo$","Openflights")
	server.EnableFileServer("htdocs","p")
	server.Redirect("/","/p/")
	log.Fatal(server.Start(":8080"))
}
