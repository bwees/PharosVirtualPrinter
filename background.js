chrome.printerProvider.onGetCapabilityRequested.addListener(function(printerId, resultCallback) {
    resultCallback({
        "version": "1.0",
        "printer": {
          "supported_content_type": [
            {"content_type": "application/pdf", "min_version": "1.5"},
            {"content_type": "image/jpeg"},
            {"content_type": "text/plain"}
          ],
          "input_tray_unit": [
            {
              "vendor_id": "tray",
              "type": "INPUT_TRAY"
            }
          ],
          "marker": [
            {
              "vendor_id": "black",
              "type": "INK",
              "color": {"type": "BLACK"}
            },
            {
              "vendor_id": "color",
              "type": "INK",
              "color": {"type": "COLOR"}
            }
          ],
          "cover": [
            {
              "vendor_id": "front",
              "type": "CUSTOM",
              "custom_display_name": "front cover"
            }
          ],
          "vendor_capability": [],
          "color": {
            "option": [
              {"type": "STANDARD_MONOCHROME", "is_default": true},
              {"type": "STANDARD_COLOR"}
            ]
          },
          "copies": {
            "default": 1,
            "max": 100
          },
          "duplex": {
            "option": [
              {"type": "NO_DUPLEX", "is_default": true},
              {"type": "LONG_EDGE"}
            ]
          },
          "media_size": {
            "option": [
              {
                "name": "NA_LETTER",
                "width_microns": 215900,
                "height_microns": 279400
              }
            ]
          }
        }
      })
})

chrome.printerProvider.onGetPrintersRequested.addListener(function(resultCallback) {
    chrome.storage.sync.get("printers", function(data) {
        var printers = data.printers
        if (printers == undefined) {
            printers = []
        }
        resultCallback(
            printers.map(function(printer) {
                return {
                    id: printer.serverName,
                    name: printer.name
                }
            })
        )
    })
})

function requestLogin(newUrl, loginCallback) {

    // get server name from url
    var serverName = newUrl.split("/")[2]

    if (!newUrl.startsWith("http")) {
        newUrl = "https://" + newUrl
    }

    var originalTabId

    // get current tab id
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        originalTabId = tabs[0].id
    })

    chrome.tabs.create({
        url: newUrl
    });
    
    // get tab id of new window
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var tabId = tabs[0].id

        // onCompleted listener for requests from new window
        chrome.webRequest.onCompleted.addListener(function(details) {
            if (details.url.includes("/PharosAPI/logon") && details.statusCode == 200) {      
                // close login window
                chrome.tabs.remove(details.tabId)

                // set original tab as active
                chrome.tabs.update(originalTabId, {active: true})

                loginCallback()
            }
        }, { urls: ["*://*/*"], tabId: tabId}, [])
    })
}

chrome.printerProvider.onPrintRequested.addListener(async function(printJob, resultCallback) {
    requestLogin(printJob.printerId, loginCallback)

    async function loginCallback() {
        const ticket = printJob.ticket

        const printConfig = {
            "FinishingOptions":{
                "Mono":ticket.print.color.type == "STANDARD_MONOCHROME",
                "Duplex": ticket.print.duplex.type != "NO_DUPLEX",
                "PagesPerSide": "1",
                "Copies": String(ticket.print.copies.copies),
                "DefaultPageSize":"Letter",
                "PageRange":""
            },
            "PrinterName":""
        }
    
        var extension;
        switch (printJob.contentType) {
            case "application/pdf":
                extension = ".pdf"
                break
            case "image/jpeg":
                extension = ".jpg"
                break
            case "text/plain":
                extension = ".txt"
                break
        }
    
        var data = new FormData()
        data.append("MetaData", JSON.stringify(printConfig))
        data.append("content", printJob.document, printJob.title+extension)
    
    
        // get user id
        var userId = (await (await fetch("https://"+printJob.printerId+"/PharosAPI/logon")).json()).Identifier
        
        // upload to server
        var upload = await fetch("https://"+printJob.printerId+"/PharosAPI/users/"+userId+"/printjobs", {
            method: "POST",
            body: data
        })
        
        if (upload.status != 201) {
            resultCallback("FAILED")
        } else {
            resultCallback("OK")
        }
    }


})