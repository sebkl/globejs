package main

import (
	. "github.com/sebkl/gopenflights"
	. "github.com/sebkl/gotojs"
	"log"
)

func main() {
	db := NewDatabase()
	server := NewContainer()
	server.ExposeMethods(db, "Geo$", "Openflights")
	server.EnableFileServer("htdocs", "p")
	server.Redirect("/", "/p/")
	log.Fatal(server.Start(":8080"))
}
